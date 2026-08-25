import { ForwardRefExoticComponent, RefAttributes } from "react";
import { LucideProps } from "lucide-react";
import { UserRole, VerifyStatus } from "@/app/graphql/graphql";
import { Binoculars, Crown, Gamepad, Radio, User, BadgeAlert, BadgeCheck, BadgeQuestionMark } from "lucide-react";


export interface StatefulBadgeProps {
  name: string,
  icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>,
  color: string,
  description?: string,
}

export const AvailableRolesDetails: Record<UserRole, StatefulBadgeProps> = {
  "ADMIN": {
    name: "管理员",
    icon: Crown,
    color: "text-accent",
    description: "Has maximum control over the platform.",
  },
  "PLAYER": {
    name: "玩家",
    icon: User,
    color: "text-blue-500",
    description: "Participant of the match. Minimum privileges.",
  },
  "REFEREE": {
    name: "裁判",
    icon: Binoculars,
    color: "text-violet-500",
    description: "Can manage specified rooms and adjust the match state when necessary.",
  },
  "STRATEGIST": {
    name: "策略师",
    icon: Gamepad,
    color: "text-yellow-500",
    description: "Mutates the board with limited privileges.",
  },
  "STREAMER": {
    name: "直播员",
    icon: Radio,
    color: "text-fuchsia-500",
    description: "Has access to the streaming overlay and osu!tourney IPC.",
  },
} as const;

export const AvailableVerifyStatusDetails: Record<VerifyStatus, StatefulBadgeProps> = {
  "PENDING": {
    name: "待定",
    icon: BadgeQuestionMark,
    color: "text-warning",
    description: "This user's identification needs to be confirmed by an admin.",
  },
  "UNVERIFIED": {
    name: "未认证",
    icon: BadgeAlert,
    color: "text-danger",
    description: "This user is currently not a genuine participant of RCT.",
  },
  "VERIFIED": {
    name: "已认证",
    icon: BadgeCheck,
    color: "text-success",
    description: "This user is a verified member of RCT.",
  },
} as const;

export const AvailableRoles = Object.entries(AvailableRolesDetails) as [UserRole, (typeof AvailableRolesDetails)[UserRole]][];

export const AvailableVerifyStatuses = Object.entries(AvailableVerifyStatusDetails) as [VerifyStatus, (typeof AvailableVerifyStatusDetails)[VerifyStatus]][];
