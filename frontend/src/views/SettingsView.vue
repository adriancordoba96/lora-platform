<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12" md="3">
        <v-card>
          <v-list density="comfortable" nav>
            <v-list-item
              v-for="item in items"
              :key="item.value"
              :to="`/settings/${item.value}`"
              :active="$route.path === `/settings/${item.value}`"
              link
            >
              <v-list-item-title>{{ item.title }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
      <v-col cols="12" md="9">
        <router-view />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const items = [
  { value: 'general', title: 'General' },
  { value: 'dashboard', title: 'Dashboard' },
  { value: 'groups', title: 'Groups' },
  { value: 'nodes', title: 'Nodes' },
  { value: 'gateway', title: 'Gateway' },
  { value: 'alarms', title: 'Alarms' },
  { value: 'profiles', title: 'Profiles' },
  { value: 'system', title: 'System' }
]
</script>
