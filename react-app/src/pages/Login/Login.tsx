import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithPopup, GoogleAuthProvider, GithubAuthProvider, onAuthStateChanged } from 'firebase/auth';

import styles from './Styles.module.scss'; // Import the styles
import backgroundImage from "@/assets/ChefAgent.png";
import { useAuth } from '@/hooks/useAuth';
import { useMediaQuery } from 'react-responsive';

const providerGoogle = new GoogleAuthProvider();
const providerGithub = new GithubAuthProvider();

export default function Login() {
  const navigate = useNavigate();
  const { previousPath, setUser } = useAuth();
  const isMobile = useMediaQuery({ maxWidth: 1100 });
  

  useEffect(() => {
    const auth = getAuth();
    console.log('Login: checking auth state', auth);

    // If a user is already signed in, redirect immediately.
    if (auth.currentUser) {
      setUser(auth.currentUser);
      navigate("/");
      return;
    }

    // Listen for auth state changes and redirect when a user signs in.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) navigate(previousPath || '/');
    });

    return () => unsubscribe();
  }, [navigate]);

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
    <div className={styles.Login}>
      <div className={styles.Left}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontWeight: 700, fontSize: '2rem', color: '#388e3c', marginBottom: '0.5rem' }}>Welcome to Chef Andel</h1>
          <p style={{ fontSize: '1.1rem', color: '#333', margin: 0 }}>To proceed, please sign-in</p>
        </div>
        <div className={styles.LoginBox} style={{  }}>
          <h2 className="mb-4" style={{ textAlign: 'center' }}>Sign In</h2>
          <button className="btn btn-outline-primary w-100 mb-3 d-flex align-items-center justify-content-center" onClick={handleGoogleLogin}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: 24, height: 24, marginRight: 12 }} />
            Sign in with Google
          </button>
          {/* <button className="btn btn-outline-dark w-100 d-flex align-items-center justify-content-center" onClick={handleGithubLogin}>
            <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" alt="GitHub" style={{ width: 24, height: 24, marginRight: 12, background: '#fff', borderRadius: '50%' }} />
            Sign in with GitHub
          </button> */}
        </div>
      </div>
      {
        !isMobile &&
        <div className={styles.Right} style={{ backgroundImage: `url(${backgroundImage})` }}></div>
      }
    </div>
  );
}
