<script setup lang="ts">
import "@wangeditor/editor/dist/css/style.css";
import { Boot, DomEditor } from "@wangeditor/editor";
import { Editor, Toolbar } from "@wangeditor/editor-for-vue";
import { Transforms } from "slate";
import { onBeforeUnmount, ref, shallowRef, watch } from "vue";

type TableCellNode = {
  type: "table-cell";
  colSpan?: number;
  rowSpan?: number;
  children: Array<{ text: string }>;
};

type TableRowNode = {
  type: "table-row";
  children: TableCellNode[];
};

type TableNode = {
  type: "table";
  children: TableRowNode[];
};

type TableCellContext = {
  cell: TableCellNode;
  cellPath: number[];
  row: TableRowNode;
  rowPath: number[];
  table: TableNode;
  tablePath: number[];
  rowIndex: number;
  cellIndex: number;
  colSpan: number;
  rowSpan: number;
  colStart: number;
};

let menusRegistered = false;

function safeRegisterMenu(menu: { key: string; factory: () => any }) {
  try {
    Boot.registerMenu(menu);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Duplicated key")) {
      return;
    }
    throw error;
  }
}

function getTableCellContext(editor): TableCellContext | null {
  const cell = DomEditor.getSelectedNodeByType(
    editor,
    "table-cell"
  ) as TableCellNode | null;
  if (!cell) return null;
  const cellPath = DomEditor.findPath(editor, cell);
  const row = DomEditor.getParentNode(editor, cell) as TableRowNode | null;
  if (!row || row.type !== "table-row") return null;
  const rowPath = DomEditor.findPath(editor, row);
  const table = DomEditor.getParentNode(editor, row) as TableNode | null;
  if (!table || table.type !== "table") return null;
  const tablePath = DomEditor.findPath(editor, table);
  const rowIndex = rowPath[rowPath.length - 1];
  const cellIndex = row.children.findIndex(item => item === cell);
  if (cellIndex < 0) return null;
  const colSpan = cell.colSpan ?? 1;
  const rowSpan = cell.rowSpan ?? 1;
  let colStart = 0;
  for (let i = 0; i < cellIndex; i += 1) {
    colStart += row.children[i]?.colSpan ?? 1;
  }
  return {
    cell,
    cellPath,
    row,
    rowPath,
    table,
    tablePath,
    rowIndex,
    cellIndex,
    colSpan,
    rowSpan,
    colStart
  };
}

function createEmptyCell(): TableCellNode {
  return { type: "table-cell", children: [{ text: "" }] };
}

function mergeCellRight(editor): boolean {
  const ctx = getTableCellContext(editor);
  if (!ctx) return false;
  const targetIndex = ctx.cellIndex + 1;
  const targetCell = ctx.row.children[targetIndex];
  if (!targetCell) return false;
  const targetRowSpan = targetCell.rowSpan ?? 1;
  if (ctx.rowSpan !== targetRowSpan) return false;
  const nextColSpan = targetCell.colSpan ?? 1;
  const targetPath = ctx.rowPath.concat([targetIndex]);
  Transforms.setNodes(
    editor,
    { colSpan: ctx.colSpan + nextColSpan },
    { at: ctx.cellPath }
  );
  Transforms.removeNodes(editor, { at: targetPath });
  return true;
}

function findCellInRowByColStart(row: TableRowNode, colStart: number) {
  let cursor = 0;
  for (let i = 0; i < row.children.length; i += 1) {
    const cell = row.children[i];
    if (cursor === colStart) {
      return { cell, index: i };
    }
    cursor += cell.colSpan ?? 1;
  }
  return null;
}

function mergeCellDown(editor): boolean {
  const ctx = getTableCellContext(editor);
  if (!ctx) return false;
  if (ctx.rowSpan !== 1) return false;
  const nextRow = ctx.table.children[ctx.rowIndex + 1];
  if (!nextRow) return false;
  const targetInfo = findCellInRowByColStart(nextRow, ctx.colStart);
  if (!targetInfo) return false;
  const targetCell = targetInfo.cell;
  const targetColSpan = targetCell.colSpan ?? 1;
  const targetRowSpan = targetCell.rowSpan ?? 1;
  if (targetColSpan !== ctx.colSpan || targetRowSpan !== 1) return false;
  const targetRowPath = ctx.tablePath.concat([ctx.rowIndex + 1]);
  const targetCellPath = targetRowPath.concat([targetInfo.index]);
  Transforms.setNodes(
    editor,
    { rowSpan: ctx.rowSpan + targetRowSpan },
    { at: ctx.cellPath }
  );
  Transforms.removeNodes(editor, { at: targetCellPath });
  return true;
}

function findInsertIndexByColStart(row: TableRowNode, colStart: number) {
  let cursor = 0;
  for (let i = 0; i < row.children.length; i += 1) {
    if (cursor >= colStart) return i;
    cursor += row.children[i].colSpan ?? 1;
  }
  return row.children.length;
}

function splitCell(editor): boolean {
  const ctx = getTableCellContext(editor);
  if (!ctx) return false;
  if (ctx.colSpan === 1 && ctx.rowSpan === 1) return false;
  for (let i = 1; i < ctx.colSpan; i += 1) {
    const insertPath = ctx.rowPath.concat([ctx.cellIndex + i]);
    Transforms.insertNodes(editor, createEmptyCell(), { at: insertPath });
  }
  for (let i = 1; i < ctx.rowSpan; i += 1) {
    const row = ctx.table.children[ctx.rowIndex + i];
    if (!row) continue;
    const insertIndex = findInsertIndexByColStart(row, ctx.colStart);
    const rowPath = ctx.tablePath.concat([ctx.rowIndex + i]);
    const insertPath = rowPath.concat([insertIndex]);
    Transforms.insertNodes(editor, createEmptyCell(), { at: insertPath });
  }
  Transforms.setNodes(editor, { colSpan: 1, rowSpan: 1 }, { at: ctx.cellPath });
  return true;
}

function registerTableMenus() {
  if (menusRegistered) return;
  menusRegistered = true;

  safeRegisterMenu({
    key: "mergeTableCellRight",
    factory() {
      return {
        title: "合并右侧",
        tag: "button",
        isActive() {
          return false;
        },
        getValue() {
          return "";
        },
        isDisabled(editor) {
          const ctx = getTableCellContext(editor);
          if (!ctx) return true;
          const target = ctx.row.children[ctx.cellIndex + 1];
          if (!target) return true;
          const targetRowSpan = target.rowSpan ?? 1;
          return ctx.rowSpan !== targetRowSpan;
        },
        exec(editor) {
          mergeCellRight(editor);
        }
      };
    }
  });

  safeRegisterMenu({
    key: "mergeTableCellDown",
    factory() {
      return {
        title: "合并下方",
        tag: "button",
        isActive() {
          return false;
        },
        getValue() {
          return "";
        },
        isDisabled(editor) {
          const ctx = getTableCellContext(editor);
          if (!ctx || ctx.rowSpan !== 1) return true;
          const nextRow = ctx.table.children[ctx.rowIndex + 1];
          if (!nextRow) return true;
          const target = findCellInRowByColStart(nextRow, ctx.colStart);
          if (!target) return true;
          const targetColSpan = target.cell.colSpan ?? 1;
          const targetRowSpan = target.cell.rowSpan ?? 1;
          return targetColSpan !== ctx.colSpan || targetRowSpan !== 1;
        },
        exec(editor) {
          mergeCellDown(editor);
        }
      };
    }
  });

  safeRegisterMenu({
    key: "splitTableCell",
    factory() {
      return {
        title: "拆分单元格",
        tag: "button",
        isActive() {
          return false;
        },
        getValue() {
          return "";
        },
        isDisabled(editor) {
          const ctx = getTableCellContext(editor);
          if (!ctx) return true;
          return ctx.colSpan === 1 && ctx.rowSpan === 1;
        },
        exec(editor) {
          splitCell(editor);
        }
      };
    }
  });
}

registerTableMenus();

const props = withDefaults(
  defineProps<{
    modelValue: string;
    height?: string;
    placeholder?: string;
  }>(),
  {
    modelValue: "",
    height: "200px",
    placeholder: "请输入内容..."
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const mode = "default";
const editorRef = shallowRef();
const valueHtml = ref(props.modelValue ?? "");

watch(
  () => props.modelValue,
  value => {
    if (value !== valueHtml.value) {
      valueHtml.value = value ?? "";
    }
  }
);

watch(valueHtml, value => {
  emit("update:modelValue", value ?? "");
});

const toolbarConfig: any = { excludeKeys: ["fullScreen"] };
const editorConfig = {
  placeholder: props.placeholder,
  hoverbarKeys: {
    table: {
      menuKeys: [
        "enter",
        "tableHeader",
        "tableFullWidth",
        "insertTableRow",
        "deleteTableRow",
        "insertTableCol",
        "deleteTableCol",
        "mergeTableCellRight",
        "mergeTableCellDown",
        "splitTableCell",
        "deleteTable"
      ]
    }
  }
};

const handleCreated = editor => {
  editorRef.value = editor;
};

onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (editor == null) return;
  editor.destroy();
});
</script>

<template>
  <div class="wangeditor">
    <Toolbar
      :editor="editorRef"
      :defaultConfig="toolbarConfig"
      :mode="mode"
      style="border-bottom: 1px solid #ccc"
    />
    <Editor
      v-model="valueHtml"
      :defaultConfig="editorConfig"
      :mode="mode"
      :style="{ height: props.height, overflowY: 'hidden' }"
      @onCreated="handleCreated"
    />
  </div>
</template>

<style scoped>
.wangeditor :deep(.w-e-text table) {
  width: auto;
  max-width: 100%;
  margin: 0 auto;
  border-collapse: collapse;
}

.wangeditor :deep(.w-e-text th),
.wangeditor :deep(.w-e-text td) {
  padding: 6px;
  border: 1px solid #333;
}
</style>
