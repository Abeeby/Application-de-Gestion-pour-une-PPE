import { pool } from '../../db/pool.js'
import { ID_PPE_DEFAUT } from '../../config/constants.js'

// KAN-32 : evolution de la production photovoltaique. Le compteur commun de
// type 'production_pv' (voir seed.js) porte les releves mensuels ; la colonne
// 'consommation' de Releves represente ici la production du mois (kWh), et
// 'revenu' la revente de cette production au distributeur.
export async function getEvolutionProduction(annee) {
  const [lignes] = await pool.query(
    `SELECT r.date_releve, r.consommation AS production_kwh, r.revenu, r.cout
     FROM Releves r
     JOIN Compteurs c ON c.id = r.id_compteur
     WHERE c.id_ppe = ? AND c.type = 'production_pv' AND YEAR(r.date_releve) = ?
     ORDER BY r.date_releve ASC`,
    [ID_PPE_DEFAUT, annee],
  )

  return lignes.map((ligne) => ({
    annee,
    mois: Number(ligne.date_releve.slice(5, 7)),
    productionKwh: Number(ligne.production_kwh),
    revenuChf: Number(ligne.revenu ?? 0),
    chargesChf: Number(ligne.cout ?? 0),
  }))
}
