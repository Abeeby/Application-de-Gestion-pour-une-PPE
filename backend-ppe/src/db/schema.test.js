import { test } from 'node:test'
import assert from 'node:assert'
import { readFile } from 'node:fs/promises'
import { comparerSchemas, lireSchemaAttendu, messageSchema } from './schema.js'

// --- Verification de la base au demarrage (evite les 500 "base pas a jour") ---

const sqlExemple = `
CREATE TABLE Lots (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- (commentaire avec parentheses)
  reference VARCHAR(20) NOT NULL,
  quote_part DECIMAL(5,2) NOT NULL,
  CONSTRAINT fk_lots_ppe
    FOREIGN KEY (id_ppe) REFERENCES PPE(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS Historique (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  action ENUM('creation','modification') NOT NULL,
  UNIQUE KEY uq (id)
) ENGINE=InnoDB;
`

test('BD.sql : les tables et colonnes sont lues, sans les contraintes ni les commentaires', () => {
  const schema = lireSchemaAttendu(sqlExemple)
  assert.deepStrictEqual([...schema.keys()], ['Lots', 'Historique'])
  assert.deepStrictEqual(schema.get('Lots'), ['id', 'reference', 'quote_part'])
  assert.deepStrictEqual(schema.get('Historique'), ['id', 'action'])
})

test('le vrai BD.sql contient les 18 tables de l application', async () => {
  const schema = lireSchemaAttendu(await readFile(new URL('../../BD.sql', import.meta.url), 'utf8'))
  assert.strictEqual(schema.size, 18)
  assert.ok(schema.get('Transactions').includes('id_projet'))
  assert.ok(schema.get('Categories').includes('cle_repartition'))
  // Aucune suite de contrainte (ON DELETE..., REFERENCES...) prise pour une colonne
  for (const [table, colonnes] of schema) {
    for (const colonne of colonnes) {
      assert.ok(!['ON', 'REFERENCES', 'FOREIGN', 'CONSTRAINT'].includes(colonne.toUpperCase()), `${table}.${colonne}`)
    }
  }
  assert.deepStrictEqual(schema.get('Transactions'), ['id', 'id_ppe', 'id_categorie', 'id_projet', 'id_lot', 'id_facture', 'montant', 'date_transaction', 'description', 'type'])
})

test('une base a jour ne signale rien (casse des noms ignoree, comme MySQL sous Windows)', () => {
  const attendu = lireSchemaAttendu(sqlExemple)
  const reel = [
    { table: 'lots', colonne: 'id' }, { table: 'lots', colonne: 'reference' }, { table: 'lots', colonne: 'quote_part' },
    { table: 'historique', colonne: 'id' }, { table: 'historique', colonne: 'action' },
  ]
  assert.deepStrictEqual(comparerSchemas(attendu, reel), { tablesManquantes: [], colonnesManquantes: [] })
})

test('une ancienne base : table et colonne manquantes sont nommees, avec la commande pour corriger', () => {
  const attendu = lireSchemaAttendu(sqlExemple)
  const reel = [{ table: 'Lots', colonne: 'id' }, { table: 'Lots', colonne: 'reference' }]
  const resultat = comparerSchemas(attendu, reel)
  assert.deepStrictEqual(resultat, { tablesManquantes: ['Historique'], colonnesManquantes: ['Lots.quote_part'] })
  const message = messageSchema(resultat)
  assert.ok(message.includes('Historique') && message.includes('Lots.quote_part') && message.includes('BD.sql'))
})
