# 🔄 Transfert des Données entre Utilisateurs

## 📊 Situation Actuelle

Vous avez **2 utilisateurs** dans Supabase :

1. **`lacanopee52@gmail.com`** → 0 ingrédients
2. **`frmunoz@orange.fr`** → 953 ingrédients ✅

Les matières premières ont été importées avec le compte **`frmunoz@orange.fr`**.

## 🎯 Solutions

### Solution 1 : Utiliser le compte avec les données (RECOMMANDÉ)

**Connectez-vous avec le compte qui a les données :**

1. Allez sur `http://localhost:3000/login`
2. Utilisez l'email : **`frmunoz@orange.fr`**
3. Utilisez le mot de passe de ce compte

Vous verrez alors toutes les 953 matières premières ! ✅

---

### Solution 2 : Transférer les données vers votre compte actuel

Si vous préférez utiliser **`lacanopee52@gmail.com`**, vous pouvez transférer les données :

#### Étape 1 : Vérifier les données

```bash
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts
npx tsx check-user-data.ts
```

#### Étape 2 : Transférer les données

1. Ouvrez le fichier : `scripts/transfer-data.ts`
2. Trouvez la ligne `// await transfer()` à la fin
3. Décommentez-la (enlevez les `//`)
4. Exécutez :

```bash
npx tsx transfer-data.ts
```

⚠️ **Attention** : Cette opération va changer le `user_id` de tous les ingrédients de `frmunoz@orange.fr` vers `lacanopee52@gmail.com`.

---

### Solution 3 : Réimporter avec le bon compte

Si vous préférez, vous pouvez réimporter les données avec le bon `user_id` :

1. Connectez-vous avec **`lacanopee52@gmail.com`**
2. Notez votre `user_id` (visible dans la console du navigateur ou via Supabase)
3. Exécutez l'import avec ce `user_id` :

```bash
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts
npx tsx import-with-user.ts <user_id_de_lacanopee52>
```

---

## 🔍 Vérification

Pour vérifier quel compte a des données :

```bash
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts
npx tsx check-user-data.ts
```

---

## 💡 Recommandation

**Utilisez le compte `frmunoz@orange.fr`** qui a déjà toutes les données importées. C'est la solution la plus simple et la plus rapide !
