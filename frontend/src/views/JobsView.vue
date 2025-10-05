<script>
    import {
        ref
    } from 'vue'

    import api from '../services/api'

    const uploading = ref(false)
    const job = ref(null)
    const glossaryId = ref(1)

    async function sendJob(e) {
        const file = e.target.files ?.[0]
        if (!file) return

        uploading.value = true
        const form = new FormData()
        form.append('file', file)
        form.append('glossary_id', String(glossaryId.value))
        form.append('source_lang', 'pt-BR')
        form.append('target_lang', 'en-US')
        const {
            data
        } = await api.post('/jobs', form)

        job.value = data
        uploading.value = false
    }
</script>

<template>
    <v-container class="mt-6">
        <v-card elevation="3" class="pa-4">
            <v-card-title>DOCX → DOCX (Glossary Enforcement)</v-card-title>
            <v-row class="pa-2" align="center" no-gutters>
                <v-col cols="12" md="3">
                    <v-text-field v-model.number="glossaryId" label="Glossary ID" type="number" density="compact" />
                </v-col>
                <v-col cols="12" md="9">
                    <v-file-input label="Upload DOCX" accept=".docx" :disabled="uploading" @change="sendJob" />
                </v-col>
            </v-row>
            <v-divider class="my-4" />
            <div v-if="job">
                <pre>{{ job }}</pre>
            </div>
        </v-card>
    </v-container>
</template>
