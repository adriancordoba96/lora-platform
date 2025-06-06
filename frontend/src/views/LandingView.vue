<template>
  <v-container fluid>
    <!-- Hero Section -->
    <v-row class="my-16" align="center" justify="center">
      <v-col cols="12" md="8" class="text-center">
        <h1 class="display-1 font-weight-bold">{{ t('hero.title') }}</h1>
        <p class="text-subtitle-1 mt-4">{{ t('hero.subtitle') }}</p>
        <v-btn color="primary" class="mt-6" to="/register" large>{{ t('hero.cta') }}</v-btn>
      </v-col>
    </v-row>

    <!-- Features Section -->
    <v-row class="my-12" justify="center">
      <v-col cols="12" md="3" class="text-center">
        <v-icon size="48">mdi-access-point</v-icon>
        <h3 class="font-weight-medium mt-3">{{ t('features.realtime.title') }}</h3>
        <p>{{ t('features.realtime.desc') }}</p>
      </v-col>
      <v-col cols="12" md="3" class="text-center">
        <v-icon size="48">mdi-cog-sync</v-icon>
        <h3 class="font-weight-medium mt-3">{{ t('features.automation.title') }}</h3>
        <p>{{ t('features.automation.desc') }}</p>
      </v-col>
      <v-col cols="12" md="3" class="text-center">
        <v-icon size="48">mdi-chart-line</v-icon>
        <h3 class="font-weight-medium mt-3">{{ t('features.analysis.title') }}</h3>
        <p>{{ t('features.analysis.desc') }}</p>
      </v-col>
    </v-row>

    <!-- How it Works -->
    <v-row class="my-16 py-10" style="background-color: #f0f0f0;" justify="center">
      <v-col cols="12" md="8">
        <h2 class="text-center font-weight-bold mb-8">{{ t('how.title') }}</h2>
        <v-row>
          <v-col cols="12" md="4" class="text-center">
            <v-icon size="36" color="primary">mdi-account-plus</v-icon>
            <h4 class="font-weight-medium mt-2">{{ t('how.step1.title') }}</h4>
            <p>{{ t('how.step1.desc') }}</p>
          </v-col>
          <v-col cols="12" md="4" class="text-center">
            <v-icon size="36" color="primary">mdi-plus-box</v-icon>
            <h4 class="font-weight-medium mt-2">{{ t('how.step2.title') }}</h4>
            <p>{{ t('how.step2.desc') }}</p>
          </v-col>
          <v-col cols="12" md="4" class="text-center">
            <v-icon size="36" color="primary">mdi-remote</v-icon>
            <h4 class="font-weight-medium mt-2">{{ t('how.step3.title') }}</h4>
            <p>{{ t('how.step3.desc') }}</p>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <!-- Security -->
    <v-row class="my-16" justify="center">
      <v-col cols="12" md="8" class="text-center">
        <v-icon size="48" color="primary">mdi-shield-lock</v-icon>
        <h2 class="font-weight-bold mt-4">{{ t('security.title') }}</h2>
        <p class="mt-2">{{ t('security.desc') }}</p>
      </v-col>
    </v-row>

    <!-- Footer -->
    <v-row class="py-6" style="background-color: #333; color: white;" justify="center">
      <v-col cols="12" md="8" class="text-center">
        <p>&copy; 2025 LoRa Control. {{ t('footer.rights') }}</p>
        <v-btn text class="text-white" to="/login">{{ t('footer.login') }}</v-btn>
        <v-btn text class="text-white" to="/register">{{ t('footer.register') }}</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { inject } from 'vue'

const lang = inject('lang', 'es')

const texts = {
  es: {
    hero: {
      title: 'Controla tus nodos LoRa como nunca antes',
      subtitle: 'Visualiza, automatiza y gestiona tu red LoRa desde una única plataforma sencilla y potente.',
      cta: 'Empieza ahora'
    },
    features: {
      realtime: { title: 'Monitoreo en Tiempo Real', desc: 'Visualiza el estado y los datos al instante.' },
      automation: { title: 'Automatización desde la Nube', desc: 'Configura reglas y comportamientos remotos.' },
      analysis: { title: 'Análisis y Alertas', desc: 'Consulta gráficas, métricas e informes históricos.' }
    },
    how: {
      title: '¿Cómo funciona?',
      step1: { title: '1. Regístrate', desc: 'Crea tu cuenta gratuitamente en segundos.' },
      step2: { title: '2. Añade tus nodos', desc: 'Conecta tus dispositivos LoRa fácilmente.' },
      step3: { title: '3. Control total', desc: 'Consulta y automatiza todo desde la plataforma.' }
    },
    security: {
      title: 'Seguridad total para tu red',
      desc: 'Tus datos están cifrados, tus nodos protegidos, y tú en control.'
    },
    footer: {
      rights: 'Todos los derechos reservados.',
      login: 'Login',
      register: 'Registro'
    }
  },
  en: {
    hero: {
      title: 'Control your LoRa nodes like never before',
      subtitle: 'Visualize, automate, and manage your LoRa network from one powerful platform.',
      cta: 'Get Started'
    },
    features: {
      realtime: { title: 'Real-Time Monitoring', desc: 'See your device status and data instantly.' },
      automation: { title: 'Cloud Automation', desc: 'Set rules and behavior for your remote devices.' },
      analysis: { title: 'Analysis and Alerts', desc: 'Access charts, metrics, and custom alerts.' }
    },
    how: {
      title: 'How does it work?',
      step1: { title: '1. Sign up', desc: 'Create your free account in seconds.' },
      step2: { title: '2. Add your nodes', desc: 'Easily connect your LoRa devices.' },
      step3: { title: '3. Total control', desc: 'Monitor and automate everything remotely.' }
    },
    security: {
      title: 'Total network security',
      desc: 'Your data is encrypted, your nodes are protected, and you stay in control.'
    },
    footer: {
      rights: 'All rights reserved.',
      login: 'Login',
      register: 'Register'
    }
  }
}

const t = (key) => {
  const parts = key.split('.')
  return parts.reduce((o, i) => o?.[i], texts[lang.value]) || key
}
</script>
