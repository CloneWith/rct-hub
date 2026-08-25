import { cn, Tooltip } from "@heroui/react";
import { UserRole } from "@/app/graphql/graphql";
import { AvailableRolesDetails } from "@/app/lib/model";


export default function RoleBadge({role}: {
  role: UserRole;
}) {
  const details = AvailableRolesDetails[role];

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <details.icon className={`${details.color}`}/>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <div className="flex flex-col gap-2 p-4">
          <div className="font-mono text-md">用户角色</div>
          <div className={cn(details.color, "font-mono font-bold text-lg")}>{details.name}</div>
          <div className="text-md">{details.description}</div>
        </div>
      </Tooltip.Content>
    </Tooltip>
  );
}
