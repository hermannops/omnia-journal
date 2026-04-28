-- Correction : qualifie agent.id dans les WHERE pour lever l'ambiguïté
-- avec la colonne de retour "id" du type TABLE(id uuid, ...)
create or replace function verifier_pin(
    p_numero text,
    p_pin    text
) returns table (id uuid, nom text, role text, verrouille boolean)
language plpgsql
as $$
declare
    v_agent agent%rowtype;
    v_max_essais constant smallint := 5;
begin
    select * into v_agent from agent where agent.numero_agent = p_numero and agent.actif = true;

    if not found then
        return;
    end if;

    if v_agent.pin_verrouille then
        return query select v_agent.id, v_agent.nom, v_agent.role, true;
        return;
    end if;

    if v_agent.pin_hash = crypt(p_pin, v_agent.pin_hash) then
        update agent set pin_essais_rates = 0 where agent.id = v_agent.id;
        return query select v_agent.id, v_agent.nom, v_agent.role, false;
    else
        update agent
            set pin_essais_rates = pin_essais_rates + 1,
                pin_verrouille = (pin_essais_rates + 1 >= v_max_essais)
            where agent.id = v_agent.id;
        return;
    end if;
end;
$$;
