import { cn, Tooltip } from "@heroui/react";
import { Binoculars, Crown, Gamepad, Radio, User } from "lucide-react";
import { UserRole } from "@/app/graphql/graphql";
import { StatefulBadgeProps } from "@/app/lib/model";

const roleDetailsMap: Record<UserRole, StatefulBadgeProps> = {
  "ADMIN": {
    icon: Crown,
    color: "text-accent",
    description: "Has maximum control over the platform.",
  },
  "PLAYER": {
    icon: User,
    color: "text-blue-500",
    description: "Participant of the match. Minimum privileges.",
  },
  "REFEREE": {
    icon: Binoculars,
    color: "text-violet-500",
    description: "Can manage specified rooms and adjust the match state when necessary.",
  },
  "STRATEGIST": {
    icon: Gamepad,
    color: "text-yellow-500",
    description: "Mutates the board with limited privileges.",
  },
  "STREAMER": {
    icon: Radio,
    color: "text-fuchsia-500",
    description: "Has access to the streaming overlay and osu!tourney IPC.",
  },
} as const;

export default function RoleBadge({role}: {
  role: UserRole;
}) {
  const details = roleDetailsMap[role];

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <details.icon className={`${details.color}`}/>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <div className="flex flex-col gap-2 p-4">
          <div className="font-mono text-md">User role</div>
          <div className={cn(details.color, "font-mono font-bold text-lg")}>{role}</div>
          <div className="text-md">{details.description}</div>
        </div>
      </Tooltip.Content>
    </Tooltip>
  );
}
