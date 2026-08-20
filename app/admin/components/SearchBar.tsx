"use client";

import { SearchField } from "@heroui/react";

interface SearchBarProps {
  /** 输入框占位文案（同时作为 aria-label）。 */
  placeholder: string;
  /** 输入框实时值。 */
  value: string;
  onValueChange: (v: string) => void;
  /** 按 Enter 提交搜索时触发。 */
  onSearch: (term: string) => void;
  /** 点击清除按钮时触发。 */
  onClear: () => void;
}

/**
 * 管理后台三个标签页共用的搜索框。
 *
 * 基于 HeroUI `SearchField`（react-aria-components）：
 * - 自带放大镜图标与清除按钮，无需手动包 form + 提交按钮；
 * - Enter 键提交会触发 `onSearch`，清除会触发 `onClear`。
 */
export default function SearchBar({
  placeholder,
  value,
  onValueChange,
  onSearch,
  onClear,
}: SearchBarProps) {
  return (
    <SearchField
      value={value}
      onChange={onValueChange}
      onSubmit={(v) => onSearch(v)}
      onClear={() => {
        onValueChange("");
        onClear();
      }}
      className="w-64"
    >
      <SearchField.Group>
        <SearchField.SearchIcon/>
        <SearchField.Input placeholder={placeholder}/>
        <SearchField.ClearButton aria-label="清除搜索"/>
      </SearchField.Group>
    </SearchField>
  );
}
