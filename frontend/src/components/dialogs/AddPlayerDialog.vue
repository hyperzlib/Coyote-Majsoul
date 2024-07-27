<script lang="ts" setup>
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import BindUserPanel from '../panels/BindUserPanel.vue';

defineExpose({
  name: 'AddPlayerDialog',
});

const props = withDefaults(defineProps<{
  actionName?: string;
  validator?: (playerSelector: any) => any;
}>(), {
  actionName: '添加'
});

const toast = useToast();

const visible = defineModel('visible');

const state = reactive({
  playerSelector: { isMe: true } as any,
});

const emit = defineEmits<{
  (name: 'confirm', playerSelector: any): void,
}>();

const reset = () => {
  state.playerSelector = {
    isMe: true,
  };
};

const onConfirm = () => {
  if (props.validator) {
    try {
      props.validator(state.playerSelector)
    } catch (err: any) {
      toast.add({ severity: 'error', summary: '错误', detail: err.message, life: 3000 });
      return;
    }
  }
  emit('confirm', state.playerSelector);
  visible.value = false;
};

watch(visible, (value) => {
  if (!value) {
    reset();
  }
});
</script>

<template>
  <Dialog v-model:visible="visible" modal :header="props.actionName + '玩家配置'" class="mx-4 w-full md:w-[40rem]">
    <BindUserPanel v-model="state.playerSelector"></BindUserPanel>
    <div class="flex justify-end gap-2 mt-6">
        <Button type="button" label="取消" @click="visible = false" severity="secondary"></Button>
        <Button type="button" label="确认" @click="onConfirm"></Button>
    </div>
  </Dialog>
</template>

<style scoped>
.copy-input {
  user-select: all;
  -webkit-user-select: all;
  -moz-user-select: all;
}
</style>