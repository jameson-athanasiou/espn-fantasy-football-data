module.exports = {
    "env": {
        "browser": true,
        "node": true
    },
    "parserOptions": {
        "ecmaVersion": 6,
        "sourceType": "module",
        "ecmaFeatures": {
            "jsx": true
        }
     },
    "rules": {
        "comma-dangle": ["error", "never"],
        "no-alert": "error",
        "no-debugger": "error",
        "no-console": "warn",
        "semi": "error"
    }
};
