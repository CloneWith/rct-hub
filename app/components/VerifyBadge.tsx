import { cn, Tooltip } from "@heroui/react";
import { VerifyStatus } from "@/app/graphql/graphql";
import { AvailableVerifyStatusDetails } from "@/app/lib/model";


export default function VerifyBadge({status}: {
  status: VerifyStatus;
}) {
  const details = AvailableVerifyStatusDetails[status];

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <details.icon className={`${details.color}`}/>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <div className="flex flex-col gap-2 p-4">
          <div className="font-mono text-md">认证状态</div>
          <div className={cn(details.color, "font-mono font-bold text-lg")}>{details.name}</div>
          <div className="text-md">{details.description}</div>
        </div>
      </Tooltip.Content>
    </Tooltip>
  );
}
