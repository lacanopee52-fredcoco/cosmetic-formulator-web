# 🔍 Déboguer la Recherche de Matières Premières

## ✅ Vérification : Les Données Sont Là

Les 952 ingrédients sont bien importés et liés à votre compte `frmunoz@orange.fr`.

## 🔍 Si la Recherche Ne Fonctionne Pas

### Étape 1 : Vérifier que vous êtes connecté

1. Allez sur `http://localhost:3000/dashboard/formulation`
2. Ouvrez la console du navigateur (F12 ou Cmd+Option+I)
3. Dans l'onglet "Console", tapez :
   ```javascript
   // Vérifier la session
   fetch('/api/auth/session').then(r => r.json()).then(console.log)
   ```

### Étape 2 : Tester la recherche manuellement

Dans la console du navigateur, tapez :

```javascript
// Tester la recherche directement
import('@/lib/supabase/client').then(({ createClient }) => {
  const supabase = createClient()
  supabase.auth.getUser().then(({ data: { user } }) => {
    console.log('Utilisateur:', user?.email, user?.id)
    if (user) {
      supabase
        .from('ingredients')
        .select('code, nom')
        .eq('user_id', user.id)
        .ilike('nom', '%ambrette%')
        .limit(5)
        .then(({ data, error }) => {
          console.log('Résultats:', data, error)
        })
    }
  })
})
```

### Étape 3 : Vérifier les logs dans la console

Quand vous tapez dans le champ "Matière première", vous devriez voir dans la console :

```
🔍 Recherche matières pour: ambrette user_id: d5a5db52
✅ X matières trouvées
```

Si vous ne voyez pas ces messages, la recherche ne se déclenche pas.

### Étape 4 : Vérifier les erreurs

Regardez s'il y a des erreurs en rouge dans la console. Les erreurs courantes :

- `Invalid login credentials` → Vous n'êtes pas connecté
- `JWT expired` → Votre session a expiré, reconnectez-vous
- `relation "ingredients" does not exist` → Problème de schéma Supabase
- `permission denied` → Problème de RLS (Row Level Security)

---

## 🔧 Solutions Possibles

### Solution 1 : Se déconnecter et se reconnecter

1. Cliquez sur "Déconnexion" dans le menu
2. Reconnectez-vous avec `frmunoz@orange.fr`
3. Réessayez la recherche

### Solution 2 : Vider le cache du navigateur

1. Appuyez sur Cmd+Shift+R (Mac) ou Ctrl+Shift+R (Windows) pour forcer le rechargement
2. Ou vider le cache : Safari → Réglages → Avancé → Vider les caches

### Solution 3 : Vérifier les variables d'environnement

Assurez-vous que `.env.local` contient bien :
```
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
```

---

## 📋 Checklist

- [ ] Les 952 ingrédients sont dans Supabase (vérifié avec `check-user-data.ts`)
- [ ] Vous êtes connecté avec `frmunoz@orange.fr`
- [ ] La console du navigateur ne montre pas d'erreurs
- [ ] Vous voyez les messages de debug dans la console quand vous tapez
- [ ] Le serveur Next.js est bien lancé (`npm run dev`)

---

## 💡 Test Rapide

1. Ouvrez la console (F12)
2. Allez sur la page de formulation
3. Cliquez sur "➕ Ajouter une ligne"
4. Tapez "ambrette" dans le champ "Matière première"
5. Regardez la console : vous devriez voir des messages de recherche

Dites-moi ce que vous voyez dans la console !
