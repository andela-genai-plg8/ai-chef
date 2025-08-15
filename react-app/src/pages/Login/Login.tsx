import { getAuth, signInWithPopup, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';

const providerGoogle = new GoogleAuthProvider();
const providerGithub = new GithubAuthProvider();

export default function Login() {
  const handleGoogleLogin = async () => {
    const auth = getAuth();
    try {
      await signInWithPopup(auth, providerGoogle);
    } catch (error) {
      alert('Google login failed');
    }
  };

  const handleGithubLogin = async () => {
    const auth = getAuth();
    try {
      await signInWithPopup(auth, providerGithub);
    } catch (error) {
      alert('GitHub login failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f6f6f6' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontWeight: 700, fontSize: '2rem', color: '#388e3c', marginBottom: '0.5rem' }}>Welcome to Chef Andel</h1>
        <p style={{ fontSize: '1.1rem', color: '#333', margin: 0 }}>To proceed, please sign-in</p>
      </div>
      <div style={{ maxWidth: 400, width: 400, padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 12, background: '#fff' }}>
        <h2 className="mb-4" style={{ textAlign: 'center' }}>Sign In</h2>
        <button className="btn btn-outline-primary w-100 mb-3 d-flex align-items-center justify-content-center" onClick={handleGoogleLogin}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 24, height: 24, marginRight: 12 }} />
          Sign in with Google
        </button>
        <button className="btn btn-outline-dark w-100 d-flex align-items-center justify-content-center" onClick={handleGithubLogin}>
          <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub" style={{ width: 24, height: 24, marginRight: 12, background: '#fff', borderRadius: '50%' }} />
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}
