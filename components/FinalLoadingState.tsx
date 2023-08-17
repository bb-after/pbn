import Image from 'next/image';
const skipOpenAiRevision = process.env.NEXT_PUBLIC_SKIP_OPENAI_REVISION;
    
function FinalLoadingStateComponent() {
  return (

      <div>
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