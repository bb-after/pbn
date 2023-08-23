import Image from 'next/image';
const skipOpenAiRevision = process.env.NEXT_PUBLIC_SKIP_OPENAI_REVISION;
const step2Text = "Schmearin' the jam...";
  
  function Step2LoadingStateComponent() {
    return (
      <div>
            <Image
                priority
                src="/images/jam.gif"
                height={144}
                width={144}
                alt=""
            />
            <br />
            <b>Step {skipOpenAiRevision ? '1' : '2'}:</b>
            <br />
            {`${step2Text}`}
        </div>
    );
}

export default Step2LoadingStateComponent