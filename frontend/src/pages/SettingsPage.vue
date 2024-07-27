<script lang="ts" setup>
import Toast from 'primevue/toast';
import Toolbar from 'primevue/toolbar';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import MajsoulCoyoteSettingsPanel from '../components/panels/MajsoulCoyoteSettingsPanel.vue';
import AddPlayerDialog from '../components/dialogs/AddPlayerDialog.vue';
import { CoyoteGameConfig, CoyoteGameConfigItem } from '../types/CoyoteGameConfig';
import FadeAndSlideTransitionGroup from '../components/transitions/FadeAndSlideTransitionGroup.vue';
import { asleep } from '../utils/helper';

defineExpose({
  name: 'SettingsPage'
});

const defaultGameConfig: CoyoteGameConfigItem = {
  controllerUrl: 'http://127.0.0.1:8920',
  targetClientId: 'all',
  sanma: {},
  sima: {},
}

const state = reactive({
  loading: true,

  selectPlayer: null as number | null,
  showAddPlayerConfDialog: false,
  showCopyPlayerConfDialog: false,

  gameConfigs: [] as CoyoteGameConfig,

  selectedConfig: {} as CoyoteGameConfigItem,
});

const playerOptions = computed(() => {
  return state.gameConfigs.map((conf, index) => {
    if (conf.isMe) {
      return {
        label: '当前雀魂账号',
        index,
      };
    } else if (conf.nickname) {
      return {
        label: '雀魂昵称: ' + conf.nickname,
        index,
      };
    } else if (conf.accountId) {
      return {
        label: '雀魂ID: ' + conf.accountId,
        index,
      };
    }
  });
})

const onAddPlayerConf = () => {
  state.showAddPlayerConfDialog = true;
}

const onCopyPlayerConf = () => {
  state.showCopyPlayerConfDialog = true;
}

const doAddPlayerConf = (playerSelector: any) => {
  state.gameConfigs.push({
    ...playerSelector,
    ...defaultGameConfig,
  });

  selectPlayer(state.gameConfigs.length - 1);
}

const doCopyPlayerConf = (playerSelector: any) => {
  if (state.selectPlayer === null) {
    return;
  }

  state.gameConfigs.push({
    ...state.gameConfigs[state.selectPlayer],
    ...playerSelector,
  });

  selectPlayer(state.gameConfigs.length - 1);
}

const validatePlayerConfig = (playerSelector: any) => {
  // 检测是否已经存在
  if (state.gameConfigs.some((conf) => {
    if (playerSelector.isMe) {
      return conf.isMe;
    } else if (playerSelector.nickname) {
      return conf.nickname === playerSelector.nickname;
    } else if (playerSelector.accountId) {
      return conf.accountId === playerSelector.accountId;
    }
    return false;
  })) {
    throw new Error('该玩家配置已经存在');
  }
}

const selectPlayer = (index: number) => {
  state.selectPlayer = index;
  state.selectedConfig = state.gameConfigs[index];
}

const loadGameConfigs = async () => {
  // fake loading
  await asleep(1000);

  state.gameConfigs = [
    {
      /** 使用当前用户 */
      isMe: true,
      /** 战败惩罚控制器URL */
      controllerUrl: "http://127.0.0.1:8920",
      /** 控制器ClientID */
      targetClientId: "all",
      /** 被吃碰杠时 */
      mingpai: {
        fire: 10,
        time: 5,
      },
      /** 点炮时 */
      dianpao: {
        fire: 20,
        time: 5,
      },
      /** 别家自摸时 */
      biejiazimo: {
        fire: 10,
        time: 5,
      },
      /** 别家立直时 */
      biejializhi: {
        fire: 10,
        time: 5,
      },
      /** 流局（未听） */
      liuju: {
        addRandom: 3,
      },
      /** 听牌流局 */
      tingpailiuju: {
        subRandom: 3,
      },
      /** 三麻 */
      sanma: {
        /** 一位 */
        no1: {
          subBase: 6,
        },
        /** 二位 */
        no2: {
          addBase: 5,
        },
        /** 三位 */
        no3: {
          addBase: 10,
        },
      },
      /** 四麻 */
      sima: {
        /** 一位 */
        no1: {
          subBase: 5,
        },
        /** 二位 */
        no2: null,
        /** 三位 */
        no3: {
          addBase: 5,
        },
        /** 四位 */
        no4: {
          addBase: 10,
        },
      },
      /** 被飞 */
      jifei: {
        addRandom: 5,
      },
    },
  ];

  state.loading = false;

  if (state.gameConfigs.length > 0) {
    selectPlayer(0);
  }
}

onMounted(() => {
  // fetch game configs
  loadGameConfigs();
});
</script>

<template>
  <div class="w-full page-container">
    <Toast></Toast>
    <Card class="controller-panel flex-grow-1 flex-shrink-1 w-full">
      <template #header>
        <Toolbar class="controller-toolbar">
          <template #start>
            <h2 class="font-bold text-xl ml-2">雀魂一键开电</h2>
          </template>
          <template #end>
            <div class="flex gap-2" v-if="!state.loading">
              <Button severity="secondary" icon="pi pi-plus" @click="onAddPlayerConf"></Button>
              <Select class="w-60" :modelValue="state.selectPlayer" :options="playerOptions" optionLabel="label"
                optionValue="index"></Select>
              <Button severity="secondary" icon="pi pi-copy" :disabled="state.selectPlayer === null" @click="onCopyPlayerConf"></Button>
              <Button severity="secondary" icon="pi pi-trash" :disabled="state.selectPlayer === null"></Button>
            </div>
          </template>
        </Toolbar>
      </template>

      <template #content>
        <FadeAndSlideTransitionGroup>
          <div v-if="state.loading" class="flex justify-center py-20">
            <ProgressSpinner />
          </div>
          <div v-else-if="state.selectPlayer === null">
            <div class="flex justify-center py-20">
              <p class="text-gray-500">请选择一个玩家配置</p>
            </div>
          </div>
          <div v-else class="w-full">
            <MajsoulCoyoteSettingsPanel v-model="state.selectedConfig" />
          </div>
        </FadeAndSlideTransitionGroup>
      </template>
    </Card>
    <AddPlayerDialog actionName="添加" v-model:visible="state.showAddPlayerConfDialog"
      :validator="validatePlayerConfig" @confirm="doAddPlayerConf" />
    <AddPlayerDialog actionName="复制" v-model:visible="state.showCopyPlayerConfDialog"
      :validator="validatePlayerConfig" @confirm="doCopyPlayerConf" />
  </div>
</template>

<style>
body {
  background: #eff0f0;
}

@media (prefers-color-scheme: dark) {
  body {
    background: #000;
  }
}
</style>

<style lang="scss" scoped>
$container-max-widths: (
  md: 768px,
  lg: 960px,
  xl: 1100px,
);

.page-container {
  margin-top: 2rem;
  margin-bottom: 6rem; // 为底部toast留出空间
  margin-left: auto;
  margin-right: auto;
  padding: 0 1rem;
  width: 100%;
}

@media (min-width: 768px) {
  .page-container {
    max-width: map-get($container-max-widths, lg);
  }
}

@media (min-width: 1024px) {
  .page-container {
    max-width: map-get($container-max-widths, xl);
  }
}

.controller-panel {
  background: #fcfcfc;
  border-radius: 0.8rem;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  --p-card-body-padding: 1.25rem 2rem;
}

.controller-toolbar {
  border-radius: 0;
  border: none;
  border-bottom: 1px solid #e0e0e0;
}

.input-small {
  height: 32px;
  --p-inputtext-padding-y: 0.25rem;
}

.input-text-center :deep(input) {
  text-align: center;
}

@media (prefers-color-scheme: dark) {
  .controller-panel {
    background: #121212;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  }

  .controller-toolbar {
    border-bottom: 1px solid #333;
  }
}

.pulse-btn {
  width: 100%;
  padding: 1rem;

  :deep(.p-togglebutton-content) {
    flex-direction: column;
  }
}
</style>
