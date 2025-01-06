import Button from "@mui/material/Button";
import Image from "next/image";

interface BackgroundDisplayProps {
  imageUrl: string;
}

export function ZoomBackgroundDisplay({ imageUrl }: BackgroundDisplayProps) {
  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-video">
        <Image
          src={imageUrl}
          alt="Generated Zoom background"
          fill
          className="object-cover rounded-lg"
        />
      </div>
      <Button href={imageUrl} download="zoom-background.png" component="a">
        Download Background
      </Button>
    </div>
  );
}
