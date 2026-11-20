import Image from "next/image";

// The GymNado logo: tornado-through-a-dumbbell icon (public/logo.svg, same as app/icon.svg) + wordmark.
export default function Logo({ size = 32, dark = false, className = "" }: { size?: number; dark?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold ${className}`}>
      <Image src="/logo.svg" alt="" width={size} height={size} priority />
      <span className={dark ? "text-white" : "text-twilight"}>
        Gym<span className={dark ? "text-surf" : "text-teal"}>Nado</span>
      </span>
    </span>
  );
}
