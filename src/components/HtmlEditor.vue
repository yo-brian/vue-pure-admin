<script setup lang="ts">
import "@wangeditor/editor/dist/css/style.css";
import { Editor, Toolbar } from "@wangeditor/editor-for-vue";
import { onBeforeUnmount, ref, shallowRef, watch } from "vue";

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
const editorConfig = { placeholder: props.placeholder };

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
