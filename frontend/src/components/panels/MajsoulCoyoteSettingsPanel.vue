<script lang="ts" setup>
import deepCopy from 'deepcopy';
import CoyoteActionInput from '../input/CoyoteActionInput.vue';
import Select from 'primevue/select';
import Divider from 'primevue/divider';
import InputText from 'primevue/inputtext';
import { CoyoteGameConfigItem } from '../../types/CoyoteGameConfig';
import ConfigSavePrompt from '../dialogs/ConfigSavePrompt.vue';

enum TargetType {
    All = 1,
    Client = 2,
}

defineExpose({
    name: 'MajsoulCoyoteSettingsPanel'
});

const props = defineProps<{
    modelValue: any,
    readonly?: boolean,
}>();

const state = reactive({
    confChanged: false,
    conf: {
        controllerUrl: '',
        targetType: TargetType.All,
        targetClientId: '',

        mingpai: null as any,
        dianpao: null as any,
        biejiazimo: null as any,
        biejializhi: null as any,
        liuju: null as any,
        tingpailiuju: null as any,
        jifei: null as any,

        sanma: {
            no1: null as any,
            no2: null as any,
            no3: null as any,
        },

        sima: {
            no1: null as any,
            no2: null as any,
            no3: null as any,
            no4: null as any,
        },
    }
});

const clientTargetOptions = [
    { label: '全部', value: TargetType.All },
    { label: '指定连接', value: TargetType.Client },
];

const onApiUrlBlur = () => {
    state.conf.controllerUrl = state.conf.controllerUrl.replace(/\/#\/.*$/, '');
};

const buildConfig = (): CoyoteGameConfigItem => {
    let conf: any = deepCopy(state.conf);

    if (conf.targetType === TargetType.All) {
        conf.targetClientId = 'all';
    }

    delete conf.targetType;

    for (const key in conf) {
        if (!conf[key]) {
            delete conf[key];
        }
    }

    for (const key in conf.sanma) {
        if (!conf.sanma[key]) {
            delete conf.sanma[key];
        }
    }

    for (const key in conf.sima) {
        if (!conf.sima[key]) {
            delete conf.sima[key];
        }
    }

    return conf;
}

const emit = defineEmits<{
    (name: 'update:modelValue', value: any): void,
}>();

let oldConf: typeof state.conf = deepCopy(state.conf);

let isUpdating = false;
let isRollingBack = false;

watch(() => state.conf, () => {
    if (isRollingBack) { // 避免回滚时再次触发
        isRollingBack = false;
        return;
    }

    state.confChanged = true;
}, { deep: true });

const saveConfig = () => {
    isUpdating = true;
    emit('update:modelValue', buildConfig());
    oldConf = deepCopy(state.conf);
    state.confChanged = false;
};

const rollbackConfig = () => {
    isRollingBack = true;
    state.conf = deepCopy(oldConf);
    state.confChanged = false;
};

watch(() => props.modelValue, (value) => {
    if (isUpdating) {
        isUpdating = false;
        return;
    }

    value ??= {};

    let newVal = {
        ...value,
    };

    if (newVal.targetClientId !== 'all') {
        newVal.targetType = TargetType.Client;
    } else {
        newVal.targetType = TargetType.All;
    }

    isRollingBack = true;
    Object.assign(state.conf, newVal);

    nextTick(() => {
        isRollingBack = false;
    });

    oldConf = deepCopy(newVal);
}, { immediate: true });
</script>

<template>
    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
        <label class="font-semibold w-40">战败惩罚直播组件URL</label>
        <InputText class="w-100" v-model="state.conf.controllerUrl" type="url" @blur="onApiUrlBlur" />
    </div>
    <div class="flex gap-8 mb-4 w-full">
        <div class="w-40"></div>
        <div class="opacity-60 text-right">
            默认：http://127.0.0.1:8920，<a class="underline" href="https://github.com/hyperzlib/DG-Lab-Coyote-Streaming-Widget/releases">下载战败惩罚直播组件</a>
        </div>
    </div>

    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
        <label class="font-semibold w-40">控制目标</label>
        <Select class="w-40" v-model="state.conf.targetType" :options="clientTargetOptions" optionLabel="label" optionValue="value"></Select>
    </div>

    <div v-if="state.conf.targetType === TargetType.Client">
        <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
            <label class="font-semibold w-40">目标客户端ID</label>
            <InputText class="w-100" v-model="state.conf.targetClientId" :type="'url'" />
        </div>
        <div class="flex gap-8 mb-4 w-full">
            <div class="w-40"></div>
            <div class="opacity-60 text-right">
                在战败惩罚控制器中点击“连接 DG-Lab”，可以看到客户端ID
            </div>
        </div>
    </div>

    <Divider></Divider>
    <h2 class="font-bold text-xl mt-4 mb-4">对局事件</h2>

    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
        <label class="font-semibold w-30">被吃碰杠</label>
        <CoyoteActionInput v-model="state.conf.mingpai" />
    </div>
    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
        <label class="font-semibold w-30">点铳</label>
        <CoyoteActionInput v-model="state.conf.dianpao" />
    </div>
    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
        <label class="font-semibold w-30">别家自摸</label>
        <CoyoteActionInput v-model="state.conf.biejiazimo" />
    </div>
    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
        <label class="font-semibold w-30">别家立直</label>
        <CoyoteActionInput v-model="state.conf.biejializhi" />
    </div>
    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
        <label class="font-semibold w-30">未听流局</label>
        <CoyoteActionInput v-model="state.conf.liuju" />
    </div>
    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
        <label class="font-semibold w-30">听牌流局</label>
        <CoyoteActionInput v-model="state.conf.tingpailiuju" />
    </div>
    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-2 lg:mb-2">
        <label class="font-semibold w-30">被击飞</label>
        <CoyoteActionInput v-model="state.conf.jifei" />
    </div>
    <div class="flex gap-8 mb-4 w-full">
        <div class="w-30"></div>
        <div class="opacity-60 text-right">
            被击飞后不再触发终局操作
        </div>
    </div>

    <Divider></Divider>
    <h2 class="font-bold text-xl mt-4 mb-4">四麻/活动场终局</h2>
    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
        <label class="font-semibold w-30">一位</label>
        <CoyoteActionInput v-model="state.conf.sima.no1" />
    </div>
    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
        <label class="font-semibold w-30">二位</label>
        <CoyoteActionInput v-model="state.conf.sima.no2" />
    </div>
    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
        <label class="font-semibold w-30">三位</label>
        <CoyoteActionInput v-model="state.conf.sima.no3" />
    </div>
    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
        <label class="font-semibold w-30">四位</label>
        <CoyoteActionInput v-model="state.conf.sima.no4" />
    </div>

    <Divider></Divider>
    <h2 class="font-bold text-xl mt-4 mb-4">三麻终局</h2>
    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
        <label class="font-semibold w-30">一位</label>
        <CoyoteActionInput v-model="state.conf.sanma.no1" />
    </div>
    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
        <label class="font-semibold w-30">二位</label>
        <CoyoteActionInput v-model="state.conf.sanma.no2" />
    </div>
    <div class="w-full flex flex-col md:flex-row items-top lg:items-center gap-2 lg:gap-8 mb-8 lg:mb-4">
        <label class="font-semibold w-30">三位</label>
        <CoyoteActionInput v-model="state.conf.sanma.no3" />
    </div>

    <ConfigSavePrompt :visible="state.confChanged" @save="saveConfig()" @cancel="rollbackConfig()" />
</template>