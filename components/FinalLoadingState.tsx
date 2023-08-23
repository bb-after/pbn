import Image from 'next/image';
const skipOpenAiRevision = process.env.NEXT_PUBLIC_SKIP_OPENAI_REVISION;
import styles from './styles.module.css'; // Make sure the correct path is used

function FinalLoadingStateComponent() {
  return (

      <div className={styles.loadingState}>
        <Image
          priority
          src="/images/pbj-final.gif"
          height={144}
          width={144}
          alt=""
        />
        <br />
        <b>Step {skipOpenAiRevision ? '2' : '3'}:</b>
        <br />
        Putting it together...
      </div>
  );
  }

  export default FinalLoadingStateComponent;