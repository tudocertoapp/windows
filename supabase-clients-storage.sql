-- Política de Storage para fotos de clientes
-- As fotos são salvas em avatars/{userId}/clients/{clientId}.jpg
-- A política existente de avatars permite upload quando (storage.foldername(name))[1] = userId
-- O path "userId/clients/xxx.jpg" atende: o primeiro segmento é o user_id.
-- Execute este arquivo apenas se precisar ajustar políticas. O bucket "avatars" já deve existir.

-- Garante que usuários possam fazer upload em avatars/{seu_user_id}/clients/*
-- (A política "Users can upload own avatar" já cobre avatars/{userId}/* pois [1] = userId)
-- Nenhuma alteração necessária se a política existente usar (storage.foldername(name))[1] = auth.uid()::text
