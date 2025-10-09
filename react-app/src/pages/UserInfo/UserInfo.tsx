import styles from './Styles.module.scss'; // Import the styles
import UserHealthForm from '@/components/UserHealthForm/UserHealthForm';


export default function UserInfo() {
  
  return (
    <div className={styles.UserInfo}>
      <UserHealthForm onSubmit={() => {
        console.log('UserInfo: form submitted')
      }}/>
    </div>
  );
}
