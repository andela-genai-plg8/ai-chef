<#
.SYNOPSIS
Transform a CSV file into JSON (with smart type detection).

.DESCRIPTION
Imports a CSV and writes a JSON array. The script attempts to coerce values into numbers, booleans,
DateTime, or nested JSON (if the value begins with '{' or '['). Useful for converting dataset CSVs
into structured JSON for ingestion or fixtures.

.PARAMETER InputCsv
Path to the input CSV file (required).

.PARAMETER OutputJson
Path to the output JSON file. If not provided, it will be written next to the CSV with .json extension.

.PARAMETER Delimiter
CSV delimiter character (default: ',').

.PARAMETER Pretty
If specified, the output JSON will be formatted with indentation.

.PARAMETER Utf8NoBom
Write output as UTF8 without BOM (default: true).

.EXAMPLE
.
PS> ./recipe-transform.ps1 -InputCsv recipes.csv -OutputJson recipes.json -Pretty

#>
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$InputCsv,

  [Parameter(Mandatory = $false, Position = 1)]
  [string]$OutputJson,

  [Parameter(Mandatory = $false)]
  [char]$Delimiter = ',',

  [switch]$Pretty,

  [bool]$Utf8NoBom = $true
)

if (-not (Test-Path -Path $InputCsv -PathType Leaf))
{
  Write-Error "Input CSV file not found: $InputCsv"
  exit 2
}

# Ensure output file lives in the same directory as the CSV when a bare filename is given
$inputDir = Split-Path -Parent $InputCsv
# If input path has no parent (filename only), default to current working dir
if ([string]::IsNullOrWhiteSpace($inputDir)) { $inputDir = (Get-Location).Path }

if (-not $OutputJson)
{
  # Place default output next to the input CSV
  $defaultName = [System.IO.Path]::GetFileName([System.IO.Path]::ChangeExtension($InputCsv, '.json'))
  $OutputJson = Join-Path $inputDir $defaultName
}
else
{
  $outDir = [System.IO.Path]::GetDirectoryName($OutputJson)
  if ([string]::IsNullOrWhiteSpace($outDir))
  {
    # user passed a filename only; put it next to the input CSV
    $OutputJson = Join-Path $inputDir $OutputJson
  }
  else
  {
    # normalize to full path
    $OutputJson = [System.IO.Path]::GetFullPath($OutputJson)
  }
}

# Ensure output directory exists (default to input dir if Split-Path returns empty)
$outParent = Split-Path -Parent $OutputJson
if ([string]::IsNullOrWhiteSpace($outParent)) { $outParent = $inputDir }
if (-not (Test-Path -Path $outParent))
{
  New-Item -ItemType Directory -Path $outParent -Force | Out-Null
}

# Helper: try to coerce a string value into int/double/bool/datetime/json
function Convert-ValueSmart($val)
{
  if ($null -eq $val) { return $null }
  $s = $val.ToString().Trim()
  if ($s -eq '') { return '' }

  # nested JSON detection
  if ($s.StartsWith('{') -or $s.StartsWith('['))
  {
    try
    {
      return ConvertFrom-Json -InputObject $s -ErrorAction Stop
    }
    catch
    {
      # fall through to other attempts
    }
  }

  # boolean
  switch -Regex ($s.ToLower())
  {
    '^(true|false)$' { return [System.Convert]::ToBoolean($s) }
  }

  # integer
  $intVal = 0
  if ([int]::TryParse($s, [ref]$intVal))
  {
    return $intVal
  }

  # double/decimal
  $doubleVal = 0.0
  if ([double]::TryParse($s, [ref]$doubleVal))
  {
    return $doubleVal
  }

  # datetime
  $dt = [datetime]::MinValue
  if ([datetime]::TryParse($s, [ref]$dt))
  {
    return $dt.ToString("o") # ISO 8601 string
  }

  # fallback: return original string trimmed
  return $s
}

# --- New helpers for recipe transformation ---

function Slugify([string]$s)
{
  if (-not $s) { return $null }
  $slug = $s.ToLower().Trim()
  # replace non-alphanumeric with hyphen
  $slug = [regex]::Replace($slug, "[^a-z0-9]+", "-")
  $slug = $slug.Trim('-')
  return $slug
}

function Parse-TimeToMinutes([string]$timeStr)
{
  if (-not $timeStr) { return $null }
  $s = $timeStr.ToLower()
  $total = 0
  # match hours and minutes like '1 hrs 30 mins' or '1 hr 30 min'
  $hrMatch = [regex]::Matches($s, '(\d+)\s*hr')
  foreach ($m in $hrMatch) { $total += [int]$m.Groups[1].Value * 60 }
  $minMatch = [regex]::Matches($s, '(\d+)\s*min')
  foreach ($m in $minMatch) { $total += [int]$m.Groups[1].Value }
  if ($total -gt 0) { return $total }
  # attempt to find a single number and assume minutes
  $numMatch = [regex]::Match($s, '(\d+)')
  if ($numMatch.Success) { return [int]$numMatch.Groups[1].Value }
  return $null
}

function Parse-IngredientString([string]$s)
{
  if (-not $s) { return $null }
  $str = $s.Trim()
  # try to match quantity and unit at start
  $pattern = '^(?<qty>\d+\s\d+/\d+|\d+/\d+|\d+(?:\.\d+)?)(?:\s*(?<unit>[a-zA-Z]+))?\s+(?<rest>.+)$'
  $m = [regex]::Match($str, $pattern)
  if ($m.Success)
  {
    $qty = $m.Groups['qty'].Value
    $unit = $m.Groups['unit'].Value
    $name = $m.Groups['rest'].Value.Trim()

    # compute quantity value (number when possible)
    $doubleVal = 0.0
    $qtyValue = $qty
    if ([double]::TryParse($qty, [ref]$doubleVal))
    {
      $qtyValue = $doubleVal
    }

    $unitVal = $null
    if ($unit) { $unitVal = $unit }

    return [PSCustomObject]@{
      name     = $name
      quantity = $qtyValue
      unit     = $unitVal
    }
  }
  # fallback: try capture leading fraction like '1/2 cup sugar'
  $pattern2 = '^(?<qty>\d+/\d+)(?:\s*(?<unit>[a-zA-Z]+))?\s+(?<rest>.+)$'
  $m2 = [regex]::Match($str, $pattern2)
  if ($m2.Success)
  {
    $unitVal2 = $null
    if ($m2.Groups['unit'].Value) { $unitVal2 = $m2.Groups['unit'].Value }
    return [PSCustomObject]@{
      name     = $m2.Groups['rest'].Value.Trim()
      quantity = $m2.Groups['qty'].Value
      unit     = $unitVal2
    }
  }
  # nothing parsed: return name only
  return [PSCustomObject]@{ name = $str; quantity = ''; unit = $null }
}

function Parse-DirectionsToSteps([string]$dir)
{
  if (-not $dir) { return @() }
  # split by newlines when present
  $parts = @()
  if ($dir -match "\r?\n")
  {
    $parts = ($dir -split "\r?\n") | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
  }
  else
  {
    # split into sentences reasonably
    $parts = [regex]::Split($dir, '(?<=[\.\!\?])\s+(?=[A-Z])') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
  }
  $steps = @()
  $i = 1
  foreach ($p in $parts)
  {
    # attempt to find duration in minutes like 'about 5 minutes' or '5 minutes'
    $dur = $null
    $dm = [regex]::Match($p, '(?<n>\d+)\s*(?:minutes|minute|min|mins)')
    if ($dm.Success) { $dur = [int]$dm.Groups['n'].Value }
    $steps += [PSCustomObject]@{
      step        = $i
      instruction = $p
      duration    = $dur
    }
    $i++
  }
  return $steps
}

Write-Host "Reading CSV: $InputCsv (delimiter='$Delimiter')"
$rows = Import-Csv -Path $InputCsv -Delimiter $Delimiter -Encoding UTF8

# Token dictionary: map each normalized word to a unique int
$tokenDict = @{}
$nextToken = 1

$result = @()
foreach ($r in $rows)
{
  # build recipe object according to the Recipe type
  $name = ($r.recipe_name -as [string]) -or ''
  $slug = Slugify $name

  # parse image(s)
  $image = ($r.img_src -as [string]) -or ''
  $otherImages = @()

  # parse times
  $prepMins = Parse-TimeToMinutes ($r.prep_time -as [string])
  $cookMins = Parse-TimeToMinutes ($r.cook_time -as [string])
  $totalMins = Parse-TimeToMinutes ($r.total_time -as [string])
  $preparationTime = $null
  if ($totalMins) { $preparationTime = $totalMins }
  elseif ($prepMins -or $cookMins) { $preparationTime = (($prepMins -as [int]) + ($cookMins -as [int])) }

  # servings
  $servings = $null
  if ($r.servings)
  {
    $servings = Convert-ValueSmart $r.servings
  }

  # calories - try to extract 'Calories' value from nutrition field
  $calories = $null
  if ($r.nutrition)
  {
    $cm = [regex]::Match($r.nutrition.ToString(), 'Calories[^0-9]*?(\d{1,4})')
    if ($cm.Success) { $calories = [int]$cm.Groups[1].Value }
  }

  # ingredients - split heuristically on ', ' but keep fallback
  $ingredientsRaw = @()
  if ($r.ingredients)
  {
    # sometimes ingredients contain commas inside parentheses; try splitting on ', ' then trim
    $ingredientsRaw = ($r.ingredients -split ',\s+') | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' }
  }
  $ingredients = @()
  $ingredientList = @()
  foreach ($ir in $ingredientsRaw)
  {
    $parsed = Parse-IngredientString $ir
    if ($parsed) { $ingredients += $parsed; $ingredientList += ($parsed.name) }
  }

  # instructions
  $instructions = Parse-DirectionsToSteps ($r.directions -as [string])

  # build ingredientTokens: map words to unique ints (ignore special chars)
  $ingredientTokens = @()
  foreach ($name in $ingredientList)
  {
    $clean = ($name -as [string]) -replace "[^a-zA-Z0-9\s]", ''
    $clean = $clean.ToLower().Trim()
    if ($clean -eq '') { continue }
    $words = $clean -split '\s+' | Where-Object { $_ -ne '' }
    foreach ($w in $words)
    {
      if (-not $tokenDict.ContainsKey($w))
      {
        $tokenDict[$w] = $nextToken
        $nextToken++
      }
      $tok = $tokenDict[$w]
      if (-not ($ingredientTokens -contains $tok)) { $ingredientTokens += $tok }
    }
  }

  $recipe = [ordered]@{
    name             = $name
    slug             = $slug
    description      = $null
    image            = $image
    otherImages      = $otherImages
    preparationTime  = $preparationTime
    servings         = $servings
    calories         = $calories
    ingredients      = $ingredients
    ingredientList   = $ingredientList
    ingredientTokens = $ingredientTokens
    instructions     = $instructions
  }

  $result += [PSCustomObject]$recipe
}

# Convert to JSON
$depth = 10
if ($Pretty)
{
  $json = $result | ConvertTo-Json -Depth $depth
}
else
{
  $json = $result | ConvertTo-Json -Depth $depth | Out-String | ForEach-Object { $_.Trim() }
}

# Write file with desired encoding
if ($Utf8NoBom)
{
  # create a UTF8 encoding instance without BOM
  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($OutputJson, $json, $encoding)
}
else
{
  $json | Out-File -FilePath $OutputJson -Encoding UTF8
}

Write-Host "Wrote JSON: $OutputJson" -ForegroundColor Green

# Write token dictionary to JSON file named 'tokenDictionary.json' next to the output
$tokenDictPath = Join-Path $outParent 'tokenDictionary.json'

# Build an ordered hashtable sorted by token (word) so the output is a flat object { word: int }
$tokenDictSorted = $tokenDict.GetEnumerator() | Sort-Object Key
$tokenDictOrdered = [ordered]@{}
foreach ($entry in $tokenDictSorted) { $tokenDictOrdered[$entry.Key] = $entry.Value }
$tokenDictJson = $tokenDictOrdered | ConvertTo-Json -Depth $depth

if ($Utf8NoBom)
{
  $encodingNoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($tokenDictPath, $tokenDictJson, $encodingNoBom)
}
else
{
  $tokenDictJson | Out-File -FilePath $tokenDictPath -Encoding UTF8
}
Write-Host "Wrote token dictionary: $tokenDictPath" -ForegroundColor Green
