<script lang="ts" setup>
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import Toolbar from 'primevue/toolbar';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import { useConfirm } from "primevue/useconfirm";
import MajsoulCoyoteSettingsPanel from '../components/panels/MajsoulCoyoteSettingsPanel.vue';
import AddPlayerDialog from '../components/dialogs/AddPlayerDialog.vue';
import { CoyoteGameConfig, CoyoteGameConfigItem } from '../types/CoyoteGameConfig';
import FadeAndSlideTransitionGroup from '../components/transitions/FadeAndSlideTransitionGroup.vue';
import deepCopy from 'deepcopy';
import { webApi } from '../apis/webApi';
import { useToast } from 'primevue/usetoast';

defineExpose({
  name: 'SettingsPage'
});

const confirmDialog = useConfirm();
const toast = useToast();

const defaultGameConfig: CoyoteGameConfigItem = {
  controllerUrl: 'http://127.0.0.1:8920',
  targetClientId: 'all',
  mingpai: null,
  dianpao: null,
  biejializhi: null,
  biejiazimo: null,
  liuju: null,
  tingpailiuju: null,
  jifei: null,
  sanma: {},
  sima: {},
}

const state = reactive({
  loading: true,
  loadError: null as string | null,

  selectPlayer: null as number | null,
  inputSelectPlayer: null as number | null,

  showAddPlayerConfDialog: false,
  showCopyPlayerConfDialog: false,

  gameConfigs: [] as CoyoteGameConfig,

  selectedPlayerSelector: {} as any,
  selectedConfig: {} as CoyoteGameConfigItem,

  configChanged: false,
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
});

const confirmIgnoreChange = () => {
  return new Promise<boolean>((resolve) => {
    if (state.configChanged) {
      console.log('config changed');
      confirmDialog.require({
        header: '提示',
        message: '当前配置已经修改，继续操作将会丢失修改，是否继续？',
        rejectProps: {
          label: '返回',
          severity: 'primary',
        },
        acceptProps: {
          label: '继续',
          severity: 'danger',
        },
        accept: () => {
          resolve(true);
        },
        reject: () => {
          resolve(false);
        },
      });
    } else {
      resolve(true);
    }
  });
}

const onAddPlayerConf = async () => {
  if (await confirmIgnoreChange()) {
    state.showAddPlayerConfDialog = true;
  }
}

const onCopyPlayerConf = async () => {
  if (await confirmIgnoreChange()) {
    state.showCopyPlayerConfDialog = true;
  }
}

const onDeletePlayerConf = async () => {
  if (typeof state.selectPlayer === 'number') {
    confirmDialog.require({
      header: '提示',
      message: '确定要删除该玩家配置吗？',
      rejectProps: {
        label: '取消',
        severity: 'secondary',
      },
      acceptProps: {
        label: '删除',
        severity: 'danger',
      },
      accept: () => {
        state.gameConfigs = state.gameConfigs.filter((_, index) => {
          console.log('index', index);
          return index !== state.selectPlayer;
        });

        console.log(JSON.stringify(state.gameConfigs));

        if (state.gameConfigs.length === 0) {
          state.selectPlayer = null;
        } else {
          selectPlayer(0);
        }

        onSaveConfig();
      },
    });
  }
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

  let newGameConfig = deepCopy(state.gameConfigs[state.selectPlayer]);

  newGameConfig.accountId = null;
  newGameConfig.nickname = null;
  newGameConfig.isMe = null;

  state.gameConfigs.push({
    ...newGameConfig,
    ...playerSelector,
  });

  onSaveConfig();

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
  state.inputSelectPlayer = index;
  state.selectedConfig = state.gameConfigs[index];

  state.selectedPlayerSelector = {
    accountId: state.selectedConfig.accountId,
    nickname: state.selectedConfig.nickname,
    isMe: state.selectedConfig.isMe,
  }
}

watch(() => state.inputSelectPlayer, async (value) => {
  if (typeof value === 'number' && value !== state.selectPlayer) {
    if (await confirmIgnoreChange()) {
      selectPlayer(value);
    } else {
      state.inputSelectPlayer = state.selectPlayer;
    }
  }
});

const onUpdateConfigChanged = (changed: boolean) => {
  state.configChanged = changed;
}

const onSaveConfig = async () => {
  // 合并当前配置
  if (typeof state.selectPlayer === 'number') {
    state.gameConfigs[state.selectPlayer] = {
      ...state.selectedConfig,
      ...state.selectedPlayerSelector,
    }
  }

  try {
    const res = await webApi.updateConfig(state.gameConfigs);

    if (!res) {
      throw new Error('保存配置失败: API返回为空');
    }

    if (res.status !== 1) {
      throw new Error('保存配置失败: ' + res.message);
    }

    toast.add({ severity: 'success', summary: '完成', detail: '配置已保存', life: 3000 });
  } catch (err: any) {
    console.error(err);
    toast.add({ severity: 'error', summary: '错误', detail: err.message, life: 5000 });
  }
}

const loadGameConfigs = async () => {
  state.loading = true;

  try {
    const res = await webApi.loadConfig();

    if (!res) {
      throw new Error('加载配置失败: API返回为空');
    }

    if (res.status !== 1) {
      throw new Error('加载配置失败: ' + res.message);
    }

    state.gameConfigs = res.gameConfig!;
  } catch (err: any) {
    console.error(err);
    state.loadError = err.message;
    return;
  }

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
    <ConfirmDialog></ConfirmDialog>
    <Card class="controller-panel flex-grow-1 flex-shrink-1 w-full">
      <template #header>
        <Toolbar class="controller-toolbar">
          <template #start>
            <h2 class="font-bold text-xl ml-2">雀魂一键开电</h2>
          </template>
          <template #end>
            <div class="flex gap-2" v-if="!state.loading">
              <Button severity="secondary" icon="pi pi-plus" @click="onAddPlayerConf"></Button>
              <Select class="w-60" v-model="state.inputSelectPlayer" :options="playerOptions" optionLabel="label"
                optionValue="index"></Select>
              <Button severity="secondary" icon="pi pi-copy" :disabled="state.selectPlayer === null"
                @click="onCopyPlayerConf"></Button>
              <Button severity="secondary" icon="pi pi-trash text-red-600" :disabled="state.selectPlayer === null"
                @click="onDeletePlayerConf"></Button>
            </div>
          </template>
        </Toolbar>
      </template>

      <template #content>
        <FadeAndSlideTransitionGroup>
          <div v-if="state.loadError" class="flex justify-center py-20">
            <p class="text-red-600 text-lg font-semibold">{{ state.loadError }}</p>
          </div>
          <div v-else-if="state.loading" class="flex justify-center py-20">
            <ProgressSpinner />
          </div>
          <div v-else-if="state.selectPlayer === null">
            <div class="flex justify-center py-20">
              <p class="text-gray-500">请选择一个玩家配置</p>
            </div>
          </div>
          <div v-else class="w-full">
            <MajsoulCoyoteSettingsPanel v-model="state.selectedConfig" @update:configChanged="onUpdateConfigChanged"
              @save="onSaveConfig" />
          </div>
        </FadeAndSlideTransitionGroup>
      </template>
    </Card>
    <AddPlayerDialog actionName="添加" v-model:visible="state.showAddPlayerConfDialog" :validator="validatePlayerConfig"
      @confirm="doAddPlayerConf" />
    <AddPlayerDialog actionName="复制" v-model:visible="state.showCopyPlayerConfDialog" :validator="validatePlayerConfig"
      @confirm="doCopyPlayerConf" />
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
