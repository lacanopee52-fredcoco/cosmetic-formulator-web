# 🌐 Comment Accéder à l'Application

## ✅ Le serveur est lancé

Le serveur Next.js tourne en arrière-plan sur le port 3000.

## 🔗 URL à utiliser dans Safari

### Option 1 : Page de login (RECOMMANDÉ)

Tapez directement dans la barre d'adresse de Safari :

```
http://localhost:3000/login
```

### Option 2 : Page d'inscription

```
http://localhost:3000/signup
```

## ⚠️ Si vous voyez toujours une erreur 404

### Solution 1 : Vider le cache de Safari

1. Dans Safari, appuyez sur **Cmd + Option + E** (vider le cache)
2. Ou allez dans **Safari** → **Réglages** → **Avancé** → **Vider les caches**
3. Rechargez la page (Cmd + R)

### Solution 2 : Redémarrer le serveur

Dans un terminal, exécutez :

```bash
# Arrêter le serveur
pkill -f "next dev"

# Relancer le serveur
cd /Users/fredericmmunoz/cursor1/cosmetic-formulator-web
npm run dev
```

Attendez de voir :
```
  ▲ Next.js 16.1.4
  - Local:        http://localhost:3000
```

Puis allez dans Safari sur `http://localhost:3000/login`

### Solution 3 : Utiliser un autre navigateur

Essayez avec Chrome ou Firefox pour voir si c'est un problème de cache Safari.

## 📋 Checklist

- [ ] Le serveur Next.js est lancé (`npm run dev`)
- [ ] Vous allez sur `http://localhost:3000/login` (pas juste `localhost:3000`)
- [ ] Le cache de Safari est vidé
- [ ] Les variables d'environnement sont configurées dans `.env.local`

## 🎯 Ce que vous devriez voir

Quand vous allez sur `http://localhost:3000/login`, vous devriez voir :

- Un formulaire avec "Email" et "Mot de passe"
- Un bouton "Se connecter" (rose)
- Un lien "S'inscrire" en bas
- Le titre "🧪 Cosmetic Formulator" et "La Canopée"

Si vous voyez cela, c'est bon ! Vous pouvez créer un compte.
