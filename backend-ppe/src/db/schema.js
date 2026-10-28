// Verification de la base au demarrage du serveur.
//
// Probleme frequent en equipe : quelqu'un fusionne une fonctionnalite qui
// ajoute une table ou une colonne dans BD.sql, mais les autres gardent leur
// ancienne base. Le serveur demarre quand meme, puis certaines pages
// repondent 500 (ER_NO_SUCH_TABLE, ER_BAD_FIELD_ERROR) sans explication.
//
// Ici on lit BD.sql (la reference) et on compare avec la base reelle : s'il
// manque quelque chose, le terminal dit exactement quoi et comment corriger.

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { pool } from './pool.js'

const CHEMIN_BD_SQL = fileURLToPath(new URL('../../BD.sql', import.meta.url))

// Lignes d'un CREATE TABLE qui ne sont pas des colonnes
const TYPE_COLONNE = /^`?(\w+)`?\s+(?:TINYINT|SMALLINT|MEDIUMINT|INT|INTEGER|BIGINT|DECIMAL|NUMERIC|FLOAT|DOUBLE|BOOLEAN|BOOL|BIT|CHAR|VARCHAR|TINYTEXT|TEXT|MEDIUMTEXT|LONGTEXT|BLOB|JSON|DATE|DATETIME|TIMESTAMP|TIME|YEAR|ENUM|SET)\b/i
const MOTS_HORS_COLONNE = /^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|KEY|INDEX|CHECK|FULLTEXT)\b/i

/**
 * Extrait de BD.sql la liste des tables et de leurs colonnes.
 * @param {string} sql contenu de BD.sql
 * @returns {Map<string, string[]>} table -> colonnes
 */
export function lireSchemaAttendu(sql) {
  const schema = new Map()
  // Les commentaires SQL (-- ...) peuvent contenir des parentheses
  const sansCommentaires = sql.replace(/--[^\n]*/g, '')
  const motif = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?`?(\w+)`?\s*\(([\s\S]*?)\)\s*ENGINE/gi
  for (const [, table, corps] of sansCommentaires.matchAll(motif)) {
    const colonnes = []
    for (const ligne of corps.split('\n')) {
      const texte = ligne.trim()
      if (!texte || MOTS_HORS_COLONNE.test(texte)) continue
      // Une colonne = un nom suivi d'un type SQL. Les suites de contraintes
      // sur plusieurs lignes (ON DELETE ..., REFERENCES ...) sont ignorees.
      const nom = TYPE_COLONNE.exec(texte)
      if (nom) colonnes.push(nom[1])
    }
    schema.set(table, colonnes)
  }
  return schema
}

/**
 * Compare le schema attendu a celui de la base.
 * @param {Map<string, string[]>} attendu
 * @param {{table: string, colonne: string}[]} reel colonnes presentes en base
 * @returns {{tablesManquantes: string[], colonnesManquantes: string[]}}
 */
export function comparerSchemas(attendu, reel) {
  // Comparaison sans tenir compte de la casse (MySQL sous Windows met les
  // noms de tables en minuscules)
  const present = new Map()
  for (const { table, colonne } of reel) {
    const cle = table.toLowerCase()
    if (!present.has(cle)) present.set(cle, new Set())
    present.get(cle).add(colonne.toLowerCase())
  }

  const tablesManquantes = []
  const colonnesManquantes = []
  for (const [table, colonnes] of attendu) {
    const colonnesEnBase = present.get(table.toLowerCase())
    if (!colonnesEnBase) {
      tablesManquantes.push(table)
      continue
    }
    for (const colonne of colonnes) {
      if (!colonnesEnBase.has(colonne.toLowerCase())) colonnesManquantes.push(`${table}.${colonne}`)
    }
  }
  return { tablesManquantes, colonnesManquantes }
}

/**
 * Verifie la base reelle. Ne leve jamais d'erreur : renvoie un compte rendu.
 * @returns {Promise<{ok: boolean, tablesManquantes: string[], colonnesManquantes: string[], erreur?: string}>}
 */
export async function verifierSchema() {
  try {
    const attendu = lireSchemaAttendu(await readFile(CHEMIN_BD_SQL, 'utf8'))
    const [lignes] = await pool.query(
      `SELECT TABLE_NAME AS \`table\`, COLUMN_NAME AS colonne
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()`,
    )
    const resultat = comparerSchemas(attendu, lignes)
    return { ok: resultat.tablesManquantes.length === 0 && resultat.colonnesManquantes.length === 0, ...resultat }
  } catch (error) {
    return { ok: false, tablesManquantes: [], colonnesManquantes: [], erreur: error.message }
  }
}

/** Message a afficher dans le terminal quand la base n'est pas a jour. */
export function messageSchema({ tablesManquantes, colonnesManquantes, erreur }) {
  if (erreur) return `Verification de la base impossible : ${erreur}`
  const lignes = ['', '!!! La base de donnees n est pas a jour par rapport a BD.sql !!!']
  if (tablesManquantes.length) lignes.push(`  Tables manquantes   : ${tablesManquantes.join(', ')}`)
  if (colonnesManquantes.length) lignes.push(`  Colonnes manquantes : ${colonnesManquantes.join(', ')}`)
  lignes.push(
    '  Certaines pages vont repondre "Erreur 500". Pour corriger (efface les donnees de la base PPE) :',
    '    mysql -u root -p < BD.sql',
    '    npm run seed',
    '',
  )
  return lignes.join('\n')
}
