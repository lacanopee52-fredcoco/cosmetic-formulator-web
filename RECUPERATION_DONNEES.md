# 🔄 Récupérer les Données après Suppression des Utilisateurs

## 📊 Situation

Vous avez supprimé les deux utilisateurs dans Supabase, mais **les 953 ingrédients sont toujours dans la base de données** ! Ils ont juste perdu leur `user_id` (ils sont "orphelins").

## ✅ Solution : Réassigner les Données

### Étape 1 : Créer un Nouveau Compte

1. Allez sur `http://localhost:3000/signup`
2. Créez un nouveau compte avec votre email préféré
3. Notez l'email que vous avez utilisé

### Étape 2 : Réassigner les Données

Une fois le compte créé, exécutez le script pour réassigner toutes les données :

```bash
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts
npx tsx reassign-orphan-data.ts
```

Le script va :
1. Trouver tous les ingrédients orphelins (sans `user_id` valide)
2. Vous montrer la liste des utilisateurs existants
3. Vous demander à quel utilisateur réassigner les données
4. Réassigner tous les ingrédients à ce compte

**Exemple d'utilisation :**
```
📊 Total d'ingrédients dans la base: 953
👥 Utilisateurs existants: 1
   - votre@email.com (abc12345...)

⚠️  Ingrédients orphelins (user_id invalide): 953

📋 À quel utilisateur voulez-vous réassigner les données ?
   1. votre@email.com (abc12345...)

Numéro de l'utilisateur (1, 2, etc.) : 1

⚠️  Réassigner 953 ingrédients à votre@email.com ? (oui/non): oui

✅ Réassignation terminée avec succès!
   953 ingrédients réassignés à votre@email.com
```

### Étape 3 : Vérifier

1. Connectez-vous avec votre nouveau compte
2. Allez sur la page de formulation
3. Essayez de rechercher une matière première
4. Vous devriez voir toutes vos 953 matières premières ! ✅

---

## 🔍 Alternative : Vérifier d'abord

Si vous voulez vérifier combien d'ingrédients sont orphelins :

```bash
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web/scripts
npx tsx check-user-data.ts
```

---

## ⚠️ Note Importante

- Les données ne sont **pas perdues**, elles sont juste "orphelines"
- Le script les réassigne à votre nouveau compte
- Toutes vos 953 matières premières seront disponibles après la réassignation

---

## 🚀 Résumé Rapide

1. Créez un compte : `http://localhost:3000/signup`
2. Exécutez : `npx tsx reassign-orphan-data.ts`
3. Choisissez votre compte dans la liste
4. Confirmez la réassignation
5. Connectez-vous et profitez ! ✅
