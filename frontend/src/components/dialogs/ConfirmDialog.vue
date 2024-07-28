<script setup lang="ts">
import Dialog from 'primevue/dialog';

defineExpose({
    name: 'ConfirmDialog'
})

const props = defineProps<{
    visible: boolean,
    title: string,
    message: string,
    confirmLabel: string,
    cancelLabel: string,
    onConfirm: () => void,
    onCancel: () => void,
}>();

const emit = defineEmits<{
    (name: 'confirm'): void;
    (name: 'cancel'): void;
}>();
</script>

<template>
    <Dialog :visible="props.visible" :modal="true" :closable="false" :showHeader="false" :showFooter="false">
        <div class="p-4">
            <h2 class="text-lg font-bold">{{ props.title }}</h2>
            <p class="mt-2">{{ props.message }}</p>
            <div class="flex justify-end mt-4">
                <Button size="small" text @click="emit('cancel')">{{ props.cancelLabel }}</Button>
                <Button size="small" @click="emit('confirm')">{{ props.confirmLabel }}</Button>
            </div>
        </div>
    </Dialog>
</template>