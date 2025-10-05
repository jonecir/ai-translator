<script setup>
    import { ref, onMounted } from 'vue'
    import api from '../services/api'


    const glossaries = ref([])
    const loading = ref(false)


    async function fetchGlossaries() {
        loading.value = true
        const { data } = await api.get('/glossaries')
        glossaries.value = data
        loading.value = false
    }


    async function uploadCSV(g) {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.csv'
        input.onchange = async () => {
            const form = new FormData()
            form.append('file', input.files[0])
            await api.post(`/glossaries/${g.id}/import`, form)
            await fetchGlossaries()
        }
        input.click()
    }


    onMounted(fetchGlossaries)
</script>


<template>
    <v-container class="mt-6">
        <v-card elevation="3" class="pa-4">
            <v-card-title>Glossaries</v-card-title>
            <v-data-table :items="glossaries" :loading="loading" :headers="[
                { title: 'ID', key: 'id' },
                { title: 'Name', key: 'name' },
                { title: 'Src', key: 'locale_src' },
                { title: 'Dst', key: 'locale_dst' },
                { title: 'Terms', key: 'terms' },
                { title: 'Actions', key: 'actions', sortable: false }
            ]">
                <template #item.actions="{ item }">
                    <v-btn color="primary" size="small" @click="uploadCSV(item)">Import CSV</v-btn>
                </template>
            </v-data-table>
        </v-card>
    </v-container>
</template>