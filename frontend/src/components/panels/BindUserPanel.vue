<script setup lang="ts">
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';

defineExpose({
    name: 'BindUserPanel'
});

enum UserFilter {
    Me = 1,
    Nickname = 2,
    AccountId = 3,
}

const modelValue = defineModel<{
    accountId?: number,
    nickname?: string,
    isMe?: boolean,
}>();

const state = reactive({
    userFilter: UserFilter.Me,
    inputValue: '',
});

const UserFilterOptions = [
    { label: '当前雀魂账号', value: UserFilter.Me },
    { label: '雀魂昵称', value: UserFilter.Nickname },
    { label: '雀魂ID', value: UserFilter.AccountId },
];

const inputPlaceholder = computed(() => {
    switch (state.userFilter) {
        case UserFilter.Me:
            return '使用当前登录的雀魂账号';
        case UserFilter.Nickname:
            return '请输入昵称';
        case UserFilter.AccountId:
            return '请输入雀魂ID';
        default:
            return '';
    }
});

let ignoreStateChange = false;

watch(state, () => {
    if (ignoreStateChange) {
        return;
    }

    ignoreStateChange = true;
    switch (state.userFilter) {
        case UserFilter.Me:
            modelValue.value = {
                isMe: true
            };
            break;
        case UserFilter.Nickname:
            modelValue.value = {
                nickname: state.inputValue,
            };
            break;
        case UserFilter.AccountId:
            modelValue.value = {
                accountId: parseInt(state.inputValue),
            };
            break;
    }

    nextTick(() => {
        ignoreStateChange = false;
    });
}, { deep: true });

watch(modelValue, (value) => {
    if (ignoreStateChange) {
        return;
    }

    if (!value) {
        return;
    }

    ignoreStateChange = true;

    if (value.isMe) {
        state.userFilter = UserFilter.Me;
    } else if (value.nickname) {
        state.userFilter = UserFilter.Nickname;
        state.inputValue = value.nickname;
    } else if (value.accountId) {
        state.userFilter = UserFilter.AccountId;
        state.inputValue = value.accountId.toString();
    }

    nextTick(() => {
        ignoreStateChange = false;
    });
}, { deep: true });
</script>

<template>
    <div class="w-full flex gap-4">
        <Select class="w-45 flex-grow-0 flex-shrink-0" v-model="state.userFilter" :options="UserFilterOptions"
            optionLabel="label" optionValue="value"></Select>
        <InputText class="w-100" v-model="state.inputValue" :placeholder="inputPlaceholder"
            :disabled="state.userFilter === UserFilter.Me"></InputText>
    </div>
</template>