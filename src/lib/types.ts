export type TransactionInput = {
  operateur_id: string;
  type_operation_id: string;
  numero_client?: string;
  nom_client?: string;
  montant: number;
  solde_apres: number;
  observation?: string;
};

export type Transaction = {
  id: string;
  session_id: string;
  agent_id: string;
  operateur_id: string;
  type_operation_id: string;
  numero_client: string | null;
  nom_client: string | null;
  montant: number;
  solde_apres: number;
  observation: string | null;
  horodatage: string;
  statut: string;
  client_uuid: string | null;
};
