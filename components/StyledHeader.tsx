// components/StyledHeader.js
import Image from "next/image";

const StyledHeader = () => {
  return (
    <div style={{ background: "#000", padding: 3 }}>
      <style jsx global>{`
        h1 {
          font-family: "Bungee Inline", sans-serif;
          font-weight: 400;
          font-size: 50px;
          margin-top: 20px;
        }
        body {
          background: #eee;
        }
      `}</style>
      <Image
        priority
        src="/images/sl-logo.png"
        width={720}
        height={80}
        style={{ objectFit: "contain" }}
        alt=""
      />
    </div>
  );
};

export default StyledHeader;
