// components/LayoutContainer.tsx
import { ReactNode } from "react";

type LayoutContainerProps = {
  children: ReactNode;
};

const LayoutContainer = ({ children }: LayoutContainerProps) => {
  return (
    <div
      style={{
        padding: 16,
        margin: "auto",
        maxWidth: "90%",
        overflow: "auto",
        background: "#ffffff",
      }}
    >
      {children}
    </div>
  );
};

export default LayoutContainer;
