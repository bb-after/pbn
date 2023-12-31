import Image from 'next/image';
import PeanutButterFactComponent from './PeanutButterFact';
import styles from './styles.module.css'; // Make sure the correct path is used

function Step1LoadingStateComponent() {
    return (
        <div className={styles.loadingState}>
            <Image
                priority
                src="/images/pb-animated.gif"
                height={144}
                width={144}
                alt=""
            />
            <br />
            <b>Step 1:</b>
            <br />
            Churning the (peanut) butter...
            <PeanutButterFactComponent />
        </div>
    );
}

export default Step1LoadingStateComponent;