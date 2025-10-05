<template>
    <v-app>
        <v-app-bar app color="primary" density="comfortable" dark>
            <v-toolbar-title>AI Legal-Finance Translator</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn to="/jobs" variant="text">Jobs</v-btn>
            <v-btn to="/glossaries" variant="text">Glossaries</v-btn>
        </v-app-bar>
        <v-main>
            <router-view />
        </v-main>
    </v-app>
</template>