import Image from 'next/image';
import PeanutButterFactComponent from './PeanutButterFact';

function Step1LoadingStateComponent() {
    return (
        <div>
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