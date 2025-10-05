import pluginVue from 'eslint-plugin-vue'


export default [
    {
        files: ["**/*.{js,vue}"] ,
        languageOptions: { ecmaVersion: 2023, sourceType: 'module' },
        plugins: { vue: pluginVue },
        rules: {
            'no-unused-vars': 'warn'
        }
    }
]