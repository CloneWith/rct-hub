import { cn, Tooltip } from "@heroui/react";
import { BadgeAlert, BadgeCheck, BadgeQuestionMark } from "lucide-react";
import { VerifyStatus } from "@/app/graphql/graphql";
import { StatefulBadgeProps } from "@/app/lib/model";


const badgeDetailsMap: Record<VerifyStatus, StatefulBadgeProps> = {
  "PENDING": {
    icon: BadgeQuestionMark,
    color: "text-warning",
    description: "This user's identification needs to be confirmed by an admin.",
  },
  "UNVERIFIED": {
    icon: BadgeAlert,
    color: "text-danger",
    description: "This user is currently not a genuine participant of RCT.",
  },
  "VERIFIED": {
    icon: BadgeCheck,
    color: "text-success",
    description: "This user is a verified member of RCT.",
  },
} as const;

export default function VerifyBadge({status}: {
  status: VerifyStatus;
}) {
  const details = badgeDetailsMap[status];

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <details.icon className={`${details.color}`}/>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <div className="flex flex-col gap-2 p-4">
          <div className="font-mono text-md">Verify status</div>
          <div className={cn(details.color, "font-mono font-bold text-lg")}>{status}</div>
          <div className="text-md">{details.description}</div>
        </div>
      </Tooltip.Content>
    </Tooltip>
  );
}
