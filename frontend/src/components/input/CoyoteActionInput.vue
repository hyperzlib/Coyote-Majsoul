<script lang="ts" setup>
import Select from 'primevue/select';
import InputGroup from 'primevue/inputgroup';
import InputGroupAddon from 'primevue/inputgroupaddon';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import { randomInt } from '../../utils/helper';

defineExpose({
    name: 'CoyoteActionInput'
})

const inputIdPrefix = 'coyote-action-input-' + randomInt(0, 1000000).toString().padStart(6, '0') + '-';

export type CoyoteAction = {
    addBase?: number,
    subBase?: number,
    addRandom?: number,
    subRandom?: number,
    fire?: number,
    time?: number,
};

const props = withDefaults(defineProps<{
    disabled?: boolean,
}>(), {
    disabled: false,
});

let ignoreStateUpdate = false;

const state = reactive({
    actionType: 'disabled' as 'disabled' | 'add' | 'sub' | 'fire',

    activeBaseValue: false,
    activeRandomValue: false,

    inputBaseValue: 1,
    inputRandomValue: 1,
    inputFireValue: 10,
    inputTimeValue: 5,
});

const modelValue = defineModel<CoyoteAction | null>();

const actionTypeOptions = [
    { label: '无操作', value: 'disabled' },
    { label: '增加', value: 'add' },
    { label: '减少', value: 'sub' },
    { label: '一键开火', value: 'fire' },
];

const actionConfig = computed<CoyoteAction>(() => {
    switch (state.actionType) {
        case 'add': {
            let conf: any = {};
            if (state.activeBaseValue) {
                conf.addBase = state.inputBaseValue;
            }

            if (state.activeRandomValue) {
                conf.addRandom = state.inputRandomValue;
            }

            return conf;
        }
        case 'sub': {
            let conf: any = {};
            if (state.activeBaseValue) {
                conf.subBase = state.inputBaseValue;
            }

            if (state.activeRandomValue) {
                conf.subRandom = state.inputRandomValue;
            }

            return conf;
        }
        case 'fire':
            return {
                fire: state.inputFireValue,
                time: state.inputTimeValue,
            };
        default:
            return null;
    }
});

const onActiveBaseValueChange = () => {
    if (!state.activeBaseValue) {
        state.activeRandomValue = true;
    }
};

const onActiveRandomValueChange = () => {
    if (!state.activeRandomValue) {
        state.activeBaseValue = true;
    }
};

watch(modelValue, (value) => {
    if (ignoreStateUpdate) {
        return;
    }

    // 更新输入框的值
    ignoreStateUpdate = true;
    if (value) {

        state.activeBaseValue = false;
        state.activeRandomValue = false;

        if ('addBase' in value || 'addRandom' in value) {
            state.actionType = 'add';
            if ('addBase' in value) {
                state.activeBaseValue = true;
                state.inputBaseValue = value.addBase ?? 1;
            } else if ('addRandom' in value) {
                state.activeRandomValue = true;
                state.inputRandomValue = value.addRandom ?? 1;
            }
        } else if ('subBase' in value || 'subRandom' in value) {
            state.actionType = 'sub';
            if ('subBase' in value) {
                state.activeBaseValue = true;
                state.inputBaseValue = value.subBase ?? 1;
            } else if ('subRandom' in value) {
                state.activeRandomValue = true;
                state.inputRandomValue = value.subRandom ?? 1;
            }
        } else if ('fire' in value) {
            state.actionType = 'fire';
            state.inputFireValue = value.fire ?? 10;
            state.inputTimeValue = value.time ?? 5;
        } else {
            state.actionType = 'disabled';
        }
    } else {
        state.actionType = 'disabled';
    }

    onActiveBaseValueChange(); // 确保至少有一个输入框是激活的

    nextTick(() => {
        ignoreStateUpdate = false;
    });
}, { immediate: true, deep: true });

watch(actionConfig, (value) => {
    if (ignoreStateUpdate) {
        return;
    }

    ignoreStateUpdate = true;

    modelValue.value = value;

    nextTick(() => {
        ignoreStateUpdate = false;
    });
}, { deep: true });
</script>

<template>
    <div class="flex flex-row gap-4">
        <Select class="w-35 flex-grow-0 flex-shrink-0" v-model="state.actionType" :options="actionTypeOptions"
            optionLabel="label" optionValue="value" :disabled="props.disabled"></Select>
        <template v-if="state.actionType === 'add' || state.actionType == 'sub'">
            <InputGroup class="flex-grow-0 !w-auto">
                <InputGroupAddon>
                    <Checkbox v-model="state.activeBaseValue" :inputId="inputIdPrefix + 'activeBaseValue'"
                        @change="onActiveBaseValueChange" :binary="true" />
                    <label class="ml-2 text-dark-500" :for="inputIdPrefix + 'activeBaseValue'">基础值</label>
                </InputGroupAddon>
                <InputNumber class="!w-25" v-if="state.activeBaseValue" v-model="state.inputBaseValue"
                    :disabled="props.disabled" :min="0" :max="100" :step="1">
                </InputNumber>
            </InputGroup>
            <InputGroup class="flex-grow-0 !w-auto">
                <InputGroupAddon class="flex-grow-0">
                    <Checkbox v-model="state.activeRandomValue" :inputId="inputIdPrefix + 'activeRandomValue'"
                        @change="onActiveRandomValueChange" :binary="true" />
                    <label class="ml-2 text-dark-500" :for="inputIdPrefix + 'activeRandomValue'">随机值</label>
                </InputGroupAddon>
                <InputNumber class="!w-25" v-if="state.activeRandomValue" v-model="state.inputRandomValue"
                    :disabled="props.disabled" :min="0" :max="100" :step="1">
                </InputNumber>
            </InputGroup>
        </template>
        <template v-else-if="state.actionType === 'fire'">
            <InputGroup class="flex-grow-0 !w-auto">
                <InputGroupAddon>
                    <span class="text-dark-500">一键开火强度</span>
                </InputGroupAddon>
                <InputNumber class="!w-25" v-model="state.inputFireValue" :disabled="props.disabled" :min="0" :max="30"
                    :step="1">
                </InputNumber>
            </InputGroup>
            <InputGroup class="flex-grow-0 !w-auto">
                <InputGroupAddon>
                    <span class="text-dark-500">持续时间</span>
                </InputGroupAddon>
                <InputNumber class="!w-25" v-model="state.inputTimeValue" :disabled="props.disabled" :min="0" :max="30"
                    :step="1">
                </InputNumber>
                <InputGroupAddon>
                    <span class="text-dark-500">秒</span>
                </InputGroupAddon>
            </InputGroup>
        </template>
    </div>
</template>