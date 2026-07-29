# Système municipal — Mairie des Gonaïves

## Variables d'environnement nécessaires (à ajouter dans Vercel)

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Ces deux valeurs se trouvent dans Supabase : Settings → API.

## Ajouter un nouvel agent (fait par le super administrateur)

1. Dans Supabase : Authentication → Add user → Create new user (email + mot de passe, cocher "Auto Confirm User")
2. Copier son UID
3. Dans SQL Editor, exécuter :

```sql
insert into profiles (id, full_name, role, service_id)
values ('UID_COPIÉ', 'Nom complet', 'agent', (select id from services where code = 'EC'));
```

(remplacer 'EC' par le code du service concerné : CAB, EC, URB, FIN, CUL)

## Ajouter un nouveau service

```sql
insert into services (name, code) values ('Nom du service', 'CODE');
```
