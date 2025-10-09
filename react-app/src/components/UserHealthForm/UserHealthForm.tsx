import React, { useState } from 'react';
import styles from './Styles.module.scss';

export type HealthFormData = {
  // Basic metrics
  age?: number | null;
  sex?: 'male' | 'female' | 'other' | '';
  heightCm?: number | null;
  weightKg?: number | null;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | '';
  bodyGoal?: 'lose' | 'maintain' | 'gain' | '';

  // Dietary preferences & restrictions
  cuisines?: string[]; // freeform or known list
  allergies?: string[];
  intolerances?: string[];
  dietaryRestrictions?: string[]; // vegan, vegetarian, halal, kosher, etc
  dislikes?: string[];

  // Medical conditions
  conditions?: string[]; // e.g. diabetes, hypertension, high_cholesterol

  // Lifestyle
  mealTiming?: string; // e.g. '16:8', '12:12', 'none'
  cookingSkill?: 'beginner' | 'intermediate' | 'advanced' | '';
  equipment?: string[]; // oven, blender, airfryer
  budget?: 'low' | 'medium' | 'high' | '';

  // Optional wearable consent
  connectWearables?: boolean;

  // Mood / cravings
  mood?: string;
  cravingType?: string; // sweet, salty, savory

  // Consent
  consentGiven: boolean;
};

export type UserHealthFormProps = {
  initial?: Partial<HealthFormData>;
  onSubmit?: (data: HealthFormData) => void | Promise<void>;
};

const emptyArray = <T,>(v?: T[] | undefined) => Array.isArray(v) ? v : [];

const UserHealthForm: React.FC<UserHealthFormProps> = ({ initial = {}, onSubmit }) => {
  const [form, setForm] = useState<HealthFormData>({
    age: initial.age ?? null,
    sex: initial.sex ?? '',
    heightCm: initial.heightCm ?? null,
    weightKg: initial.weightKg ?? null,
    activityLevel: initial.activityLevel ?? '',
    bodyGoal: initial.bodyGoal ?? '',

    cuisines: emptyArray(initial.cuisines),
    allergies: emptyArray(initial.allergies),
    intolerances: emptyArray(initial.intolerances),
    dietaryRestrictions: emptyArray(initial.dietaryRestrictions),
    dislikes: emptyArray(initial.dislikes),

    conditions: emptyArray(initial.conditions),

    mealTiming: initial.mealTiming ?? '',
    cookingSkill: initial.cookingSkill ?? '',
    equipment: emptyArray(initial.equipment),
    budget: initial.budget ?? '',

    connectWearables: initial.connectWearables ?? false,

    mood: initial.mood ?? '',
    cravingType: initial.cravingType ?? '',

    consentGiven: !!initial.consentGiven,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function update<K extends keyof HealthFormData>(key: K, value: HealthFormData[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function toggleList(field: keyof HealthFormData, value: string) {
    const list = (form[field] as unknown as string[]) || [];
    const has = list.includes(value);
    const next = has ? list.filter((x) => x !== value) : [...list, value];
    // @ts-ignore
    update(field, next);
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.consentGiven) errs.consentGiven = 'You must consent to collecting this data.';
    // basic sanity checks
  if (typeof form.age === 'number' && (form.age < 0 || form.age > 120)) errs.age = 'Enter a realistic age';
  if (typeof form.heightCm === 'number' && (form.heightCm < 30 || form.heightCm > 300)) errs.heightCm = 'Enter height in cm';
  if (typeof form.weightKg === 'number' && (form.weightKg < 10 || form.weightKg > 500)) errs.weightKg = 'Enter weight in kg';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (onSubmit) await onSubmit(form);
      else console.log('Collected health form data', form);
    } finally {
      setSubmitting(false);
    }
  }

  // Small lists for common options - these can be expanded or moved to constants
  const commonCuisines = ['Nigerian', 'Mediterranean', 'Indian', 'Chinese', 'Mexican', 'Italian'];
  const commonRestrictions = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Pescatarian'];
  const commonConditions = ['Diabetes', 'Hypertension', 'High cholesterol', 'Kidney disease', 'Celiac / Gluten intolerance'];
  const equipmentList = ['Oven', 'Stove', 'Blender', 'Microwave', 'Air fryer'];

  return (
    <form className={styles.Form} onSubmit={handleSubmit}>
      <h3>Health & dietary preferences</h3>

      <section className={styles.Section}>
        <h4>Basic metrics</h4>
        <div className={styles.Row}>
          <label>Age
            <input type="number" value={form.age ?? ''} onChange={(e) => update('age', e.target.value ? Number(e.target.value) : null)} />
            {errors.age && <div className={styles.Error}>{errors.age}</div>}
          </label>
          <label>Sex
            <select value={form.sex ?? ''} onChange={(e) => update('sex', e.target.value as any)}>
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
        <div className={styles.Row}>
          <label>Height (cm)
            <input type="number" value={form.heightCm ?? ''} onChange={(e) => update('heightCm', e.target.value ? Number(e.target.value) : null)} />
            {errors.heightCm && <div className={styles.Error}>{errors.heightCm}</div>}
          </label>
          <label>Weight (kg)
            <input type="number" value={form.weightKg ?? ''} onChange={(e) => update('weightKg', e.target.value ? Number(e.target.value) : null)} />
            {errors.weightKg && <div className={styles.Error}>{errors.weightKg}</div>}
          </label>
        </div>

        <div className={styles.Row}>
          <label>Activity level
            <select value={form.activityLevel ?? ''} onChange={(e) => update('activityLevel', e.target.value as any)}>
              <option value="">Select</option>
              <option value="sedentary">Sedentary</option>
              <option value="light">Lightly active</option>
              <option value="moderate">Moderately active</option>
              <option value="active">Very active</option>
            </select>
          </label>
          <label>Body goal
            <select value={form.bodyGoal ?? ''} onChange={(e) => update('bodyGoal', e.target.value as any)}>
              <option value="">Select</option>
              <option value="lose">Lose weight</option>
              <option value="maintain">Maintain</option>
              <option value="gain">Gain muscle</option>
            </select>
          </label>
        </div>
      </section>

      <section className={styles.Section}>
        <h4>Dietary preferences & restrictions</h4>
        <div className={styles.RowWrap}>
          <div>
            <label>Preferred cuisines</label>
            <div className={styles.CheckList}>
              {commonCuisines.map((c) => (
                <label key={c}><input type="checkbox" checked={form.cuisines?.includes(c)} onChange={() => toggleList('cuisines', c)} /> {c}</label>
              ))}
            </div>
          </div>

          <div>
            <label>Dietary restrictions</label>
            <div className={styles.CheckList}>
              {commonRestrictions.map((c) => (
                <label key={c}><input type="checkbox" checked={form.dietaryRestrictions?.includes(c)} onChange={() => toggleList('dietaryRestrictions', c)} /> {c}</label>
              ))}
            </div>
          </div>

          <div>
            <label>Allergies (comma-separated)</label>
            <input type="text" value={(form.allergies || []).join(', ')} onChange={(e) => update('allergies', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
          </div>

          <div>
            <label>Intolerances (comma-separated)</label>
            <input type="text" value={(form.intolerances || []).join(', ')} onChange={(e) => update('intolerances', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
          </div>
        </div>
      </section>

      <section className={styles.Section}>
        <h4>Medical conditions</h4>
        <div className={styles.CheckList}>
          {commonConditions.map((c) => (
            <label key={c}><input type="checkbox" checked={form.conditions?.includes(c)} onChange={() => toggleList('conditions', c)} /> {c}</label>
          ))}
        </div>
        <div>
          <label>Other conditions (comma-separated)</label>
          <input type="text" value={(form.conditions || []).filter(c => !commonConditions.includes(c)).join(', ')} onChange={(e) => update('conditions', [...(form.conditions || []).filter(c => commonConditions.includes(c)), ...e.target.value.split(',').map(s => s.trim()).filter(Boolean)])} />
        </div>
      </section>

      <section className={styles.Section}>
        <h4>Lifestyle & cooking</h4>
        <div className={styles.Row}>
          <label>Meal timing (optional)
            <input type="text" placeholder="e.g. 16:8" value={form.mealTiming || ''} onChange={(e) => update('mealTiming', e.target.value)} />
          </label>
          <label>Cooking skill
            <select value={form.cookingSkill ?? ''} onChange={(e) => update('cookingSkill', e.target.value as any)}>
              <option value="">Select</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
        </div>

        <div className={styles.RowWrap}>
          <div>
            <label>Available equipment</label>
            <div className={styles.CheckList}>
              {equipmentList.map((e) => (
                <label key={e}><input type="checkbox" checked={form.equipment?.includes(e)} onChange={() => toggleList('equipment', e)} /> {e}</label>
              ))}
            </div>
          </div>

          <div>
            <label>Budget</label>
            <select value={form.budget ?? ''} onChange={(e) => update('budget', e.target.value as any)}>
              <option value="">Select</option>
              <option value="low">Economical</option>
              <option value="medium">Moderate</option>
              <option value="high">Premium</option>
            </select>
          </div>
        </div>
      </section>

      <section className={styles.Section}>
        <h4>Optional wearable & biometric data</h4>
        <label><input type="checkbox" checked={!!form.connectWearables} onChange={(e) => update('connectWearables', !!e.target.checked)} /> I want to optionally connect wearable / health apps (Google Fit, HealthKit, Fitbit) to improve recommendations</label>
      </section>

      <section className={styles.Section}>
        <h4>Mood & cravings</h4>
        <div className={styles.Row}>
          <label>Mood
            <input type="text" value={form.mood || ''} onChange={(e) => update('mood', e.target.value)} placeholder="e.g. stressed, tired" />
          </label>
          <label>Craving
            <input type="text" value={form.cravingType || ''} onChange={(e) => update('cravingType', e.target.value)} placeholder="sweet, salty, crunchy" />
          </label>
        </div>
      </section>

      <section className={styles.Section}>
        <label className={styles.Consent}><input type="checkbox" checked={!!form.consentGiven} onChange={(e) => update('consentGiven', !!e.target.checked)} /> I consent to the collection and use of this health and dietary data for personalized recommendations. I understand I can edit or delete this data at any time.</label>
        {errors.consentGiven && <div className={styles.Error}>{errors.consentGiven}</div>}
      </section>

      <div className={styles.Actions}>
        <button type="button" className="btn btn-secondary" onClick={() => { /* optionally reset or close */ }}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save preferences'}</button>
      </div>
    </form>
  );
};

export default UserHealthForm;
