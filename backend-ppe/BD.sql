/* =============================================================================
   Projet   : PPE - gestion financiere d'une propriete par etages
   Fichier  : 01_schema.sql  (creation de la base et des tables)
   Auteurs  : Ruben ten Cate et Arthur Saugy
   Version  : 1.3 - 14.09.2026
   SGBD     : MySQL 8 / MariaDB 10.6+, moteur InnoDB, utf8mb4
   Execution: mysql < 01_schema.sql   (fichier 100% ASCII, aucun souci de charset)
 
   Conventions
   -----------
   - Noms de tables au pluriel, en PascalCase, sans accent ni espace.
   - Colonnes en snake_case, sans accent (portabilite + pas de backticks).
   - Cle primaire technique : id INT UNSIGNED AUTO_INCREMENT.
   - Cle etrangere : id_<table_referencee> au singulier (id_ppe, id_utilisateur).
   - Tables d'association sans id technique (Appartenir, Posseder) : la cle
     primaire est le couple de cles etrangeres.
   - Montants : DECIMAL(10,2) (jamais FLOAT, arrondis faux en comptabilite).
   - ON DELETE RESTRICT par defaut ; CASCADE seulement quand l'enfant n'a
     aucun sens sans son parent (devis, lignes de budget, commentaires, votes).
   ============================================================================= */
 
-- Creation de la base de donnees
DROP DATABASE IF EXISTS PPE;
CREATE DATABASE PPE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE PPE;
 
 
-- PPE : l'immeuble en propriete par etages. Racine de tout le modele.
CREATE TABLE PPE (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom     VARCHAR(100) NOT NULL,
  adresse VARCHAR(255) NOT NULL
) ENGINE=InnoDB COMMENT='Propriete par etages (immeuble)';
 
 
-- Utilisateurs : comptes de connexion, rien d'autre. L'identite de la personne,
-- pas son statut : le role depend de l'immeuble et vit donc dans Appartenir.
-- mot_de_passe stocke un HASH (bcrypt/argon2), jamais le mot de passe en clair.
CREATE TABLE Utilisateurs (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nom          VARCHAR(80)  NOT NULL,
  prenom       VARCHAR(80)  NOT NULL,
  email        VARCHAR(120) NOT NULL UNIQUE,
  mot_de_passe VARCHAR(255) NOT NULL COMMENT 'hash bcrypt/argon2'
) ENGINE=InnoDB;
 
 
-- -----------------------------------------------------------------------------
-- Appartenir : N-N entre Utilisateurs et PPE. Table des DROITS D'ACCES, pas de
-- propriete : elle rattache aussi le gerant, qui ne possede aucun lot.
--
-- Le role est porte ICI et non sur Utilisateurs : un gerant administre
-- plusieurs immeubles et peut etre simple coproprietaire dans un autre. Le role
-- qualifie le rattachement a un immeuble, pas la personne.
-- Association PORTEUSE (elle a une donnee propre), mais sans id technique :
-- un utilisateur n'a qu'un seul role par immeuble, le couple reste la cle.
-- -----------------------------------------------------------------------------
CREATE TABLE Appartenir (
  id_utilisateur INT UNSIGNED NOT NULL,
  id_ppe         INT UNSIGNED NOT NULL,
  role           ENUM('coproprietaire','comite','admin') NOT NULL DEFAULT 'coproprietaire',
  PRIMARY KEY (id_utilisateur, id_ppe),
  CONSTRAINT fk_appartenir_utilisateur
    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_appartenir_ppe
    FOREIGN KEY (id_ppe) REFERENCES PPE(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
 
 
-- Lots : les unites (appartements, caves, places de parc) d'un immeuble.
-- quote_part = part des charges en % (ou en milliemes, a fixer avec l'equipe).
-- nbr_pieces en DECIMAL : en Suisse un logement fait 3.5 ou 4.5 pieces.
CREATE TABLE Lots (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_ppe     INT UNSIGNED  NOT NULL,
  reference  VARCHAR(30)   NOT NULL COMMENT 'ex. A-101, B-202, C-1, P-3',
  surface    DECIMAL(10,2) NOT NULL,
  nbr_pieces DECIMAL(3,1)  NOT NULL,
  quote_part DECIMAL(5,2)  NOT NULL,
  -- une reference de lot n'est unique QUE dans son immeuble
  CONSTRAINT uq_lots_reference UNIQUE (id_ppe, reference),
  CONSTRAINT fk_lots_ppe
    FOREIGN KEY (id_ppe) REFERENCES PPE(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
 
 
-- Posseder : N-N entre Utilisateurs et Lots. Un couple peut posseder le meme
-- lot (d'ou part_propriete), un proprietaire peut avoir plusieurs lots.
CREATE TABLE Posseder (
  id_utilisateur   INT UNSIGNED NOT NULL,
  id_lot           INT UNSIGNED NOT NULL,
  part_propriete   DECIMAL(5,2) NOT NULL DEFAULT 100.00 COMMENT '% de propriete sur ce lot',
  date_acquisition DATE NULL,
  PRIMARY KEY (id_utilisateur, id_lot),
  CONSTRAINT fk_posseder_utilisateur
    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_posseder_lot
    FOREIGN KEY (id_lot) REFERENCES Lots(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
 
 
-- -----------------------------------------------------------------------------
-- Compteurs : uniquement les compteurs GERES PAR LA PPE.
--   id_lot NULL   -> compteur general ou commun de l'immeuble
--   id_lot rempli -> compteur privatif releve par la PPE (chaleur, eau chaude)
--
-- Hors perimetre : l'electricite privative d'un appartement, qui fait l'objet
-- d'un contrat direct entre l'occupant et le distributeur. La PPE ne paie que
-- l'electricite des communs (cage d'escalier, ascenseur, buanderie).
--
-- Compromis assume : id_ppe est redondant quand id_lot est rempli (l'immeuble
-- se deduirait du lot), mais il est indispensable pour les compteurs communs
-- qui n'ont pas de lot. Coherence des deux a controler cote application.
-- -----------------------------------------------------------------------------
-- NOTE MariaDB : les cles etrangeres portant sur une colonne utilisee dans un
-- CHECK n'ont PAS de ON UPDATE CASCADE. MariaDB refuse la combinaison
-- (erreur 1901). Aucune perte : la cle referencee est un AUTO_INCREMENT, elle
-- ne change jamais, donc ON UPDATE CASCADE n'aurait de toute facon rien a faire.
CREATE TABLE Compteurs (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_ppe       INT UNSIGNED NOT NULL,
  id_lot       INT UNSIGNED NULL COMMENT 'NULL = compteur commun / general',
  type         ENUM('eau','eau_chaude','chauffage','electricite','gaz') NOT NULL,
  portee       ENUM('general','commun','privatif') NOT NULL,
  numero_serie VARCHAR(50) NOT NULL,
  emplacement  VARCHAR(120) NULL,
  unite        VARCHAR(10) NOT NULL COMMENT 'kWh, m3, MJ',
  -- un compteur privatif DOIT designer un lot, un commun/general ne le peut pas
  CONSTRAINT chk_compteurs_portee CHECK (
    (portee = 'privatif' AND id_lot IS NOT NULL)
    OR (portee <> 'privatif' AND id_lot IS NULL)
  ),
  CONSTRAINT uq_compteurs_numero UNIQUE (numero_serie),
  CONSTRAINT fk_compteurs_ppe
    FOREIGN KEY (id_ppe) REFERENCES PPE(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_compteurs_lot
    FOREIGN KEY (id_lot) REFERENCES Lots(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB;
 
 
-- -----------------------------------------------------------------------------
-- Releves : index releve sur un compteur a une date donnee.
-- 1-N depuis Compteurs. index_releve est la donnee brute et verifiable ;
-- consommation est un cache calcule (index - index precedent), fige au decompte.
-- -----------------------------------------------------------------------------
CREATE TABLE Releves (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_compteur  INT UNSIGNED NOT NULL,
  date_releve  DATE NOT NULL,
  index_releve DECIMAL(12,3) NOT NULL COMMENT 'valeur lue sur le compteur',
  consommation DECIMAL(12,3) NULL COMMENT 'index - index precedent',
  cout         DECIMAL(10,2) NULL COMMENT 'montant impute en CHF',
  CONSTRAINT uq_releves_compteur_date UNIQUE (id_compteur, date_releve),
  CONSTRAINT fk_releves_compteur
    FOREIGN KEY (id_compteur) REFERENCES Compteurs(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
 
 
-- -----------------------------------------------------------------------------
-- Projets : travaux votes / en cours pour un immeuble.
-- date_fin nullable : un projet en cours n'a pas encore de date de fin.
-- -----------------------------------------------------------------------------
CREATE TABLE Projets (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_ppe        INT UNSIGNED NOT NULL,
  nom           VARCHAR(80) NOT NULL,
  description   TEXT NOT NULL,
  budget_alloue DECIMAL(10,2) NOT NULL,
  statut        ENUM('en cours','termine','annule') NOT NULL DEFAULT 'en cours',
  date_debut    DATE NOT NULL,
  date_fin      DATE NULL,
  CONSTRAINT fk_projets_ppe
    FOREIGN KEY (id_ppe) REFERENCES PPE(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
 
 
-- Devis : offres recues des entreprises pour un projet.
CREATE TABLE Devis (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_projet      INT UNSIGNED NOT NULL,
  entreprise     VARCHAR(80) NOT NULL,
  montant        DECIMAL(10,2) NOT NULL,
  description    TEXT NOT NULL,
  date_reception DATE NOT NULL,
  statut         ENUM('accepte','refuse','en attente') NOT NULL DEFAULT 'en attente',
  CONSTRAINT fk_devis_projet
    FOREIGN KEY (id_projet) REFERENCES Projets(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
 
 
-- -----------------------------------------------------------------------------
-- Budgets_Annuels : un seul budget par immeuble et par annee (d'ou l'UNIQUE).
--
-- DECISION D'EQUIPE sur prevision_budget : c'est l'ENVELOPPE VOTEE en assemblee,
-- pas le total des lignes. Les deux peuvent donc differer, et c'est voulu :
--   prevision_budget            = le plafond decide en AG
--   SUM(Ligne_Budgets.montant)  = la ventilation par categorie
-- Un ecart entre les deux est une information utile (enveloppe non ventilee ou
-- depassee), pas une incoherence. Ne JAMAIS recalculer l'un depuis l'autre.
-- -----------------------------------------------------------------------------
CREATE TABLE Budgets_Annuels (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_ppe           INT UNSIGNED NOT NULL,
  annee            SMALLINT UNSIGNED NOT NULL,
  prevision_budget DECIMAL(10,2) NOT NULL COMMENT 'enveloppe votee en AG, pas la somme des lignes',
  date_creation    DATE NOT NULL,
  statut           ENUM('approuve','en attente','rejete') NOT NULL DEFAULT 'en attente',
  CONSTRAINT uq_budget_ppe_annee UNIQUE (id_ppe, annee),
  CONSTRAINT fk_budgets_ppe
    FOREIGN KEY (id_ppe) REFERENCES PPE(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
 
 
-- Categories : nomenclature comptable (chauffage, conciergerie, assurances...).
-- Table de reference independante : ce sont Transactions, Factures et
-- Ligne_Budgets qui pointent vers elle, jamais l'inverse.
CREATE TABLE Categories (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  libelle VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;
 
 
-- -----------------------------------------------------------------------------
-- Factures : factures fournisseur (electricite des communs, chauffage, eau)
-- avec le PDF joint. Le PDF n'est PAS stocke dans la base : on garde le chemin
-- du fichier depose sur le serveur, plus les metadonnees utiles.
-- -----------------------------------------------------------------------------
CREATE TABLE Factures (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_ppe         INT UNSIGNED NOT NULL,
  id_compteur    INT UNSIGNED NULL COMMENT 'facture rattachee a un compteur precis',
  id_categorie   INT UNSIGNED NULL,
  fournisseur    VARCHAR(120) NOT NULL,
  numero_facture VARCHAR(60)  NULL,
  type           ENUM('electricite','chauffage','eau','gaz','autre') NOT NULL,
  montant        DECIMAL(10,2) NOT NULL,
  date_facture   DATE NOT NULL,
  periode_debut  DATE NULL,
  periode_fin    DATE NULL,
  fichier_pdf    VARCHAR(255) NULL COMMENT 'chemin du PDF uploade',
  CONSTRAINT fk_factures_ppe
    FOREIGN KEY (id_ppe) REFERENCES PPE(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_factures_compteur
    FOREIGN KEY (id_compteur) REFERENCES Compteurs(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_factures_categorie
    FOREIGN KEY (id_categorie) REFERENCES Categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
 
CREATE INDEX idx_factures_date ON Factures (id_ppe, date_facture);
 
 
-- Ligne_Budgets : detail du budget annuel, un montant par categorie.
CREATE TABLE Ligne_Budgets (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_budget_annuel INT UNSIGNED NOT NULL,
  id_categorie     INT UNSIGNED NOT NULL,
  montant          DECIMAL(10,2) NOT NULL,
  CONSTRAINT uq_ligne_budget UNIQUE (id_budget_annuel, id_categorie),
  CONSTRAINT fk_ligne_budgets_budget
    FOREIGN KEY (id_budget_annuel) REFERENCES Budgets_Annuels(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ligne_budgets_categorie
    FOREIGN KEY (id_categorie) REFERENCES Categories(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
 
 
-- -----------------------------------------------------------------------------
-- Transactions : mouvements reels de la comptabilite de l'immeuble.
-- C'est la table qui FERME LE CIRCUIT entre le prevu et le realise :
--   id_categorie -> comparer avec Ligne_Budgets (budgete / realise par poste)
--   id_projet    -> comparer avec Projets.budget_alloue (cout reel des travaux)
--   id_facture   -> remonter a la piece justificative et a son PDF
-- Les trois sont NULL-ables : une prime d'assurance n'a pas de projet, un
-- versement de charges n'a pas de facture fournisseur.
-- -----------------------------------------------------------------------------
CREATE TABLE Transactions (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_ppe           INT UNSIGNED NOT NULL,
  id_categorie     INT UNSIGNED NULL,
  id_projet        INT UNSIGNED NULL COMMENT 'depense imputee a un projet de travaux',
  id_facture       INT UNSIGNED NULL COMMENT 'piece justificative',
  montant          DECIMAL(10,2) NOT NULL,
  date_transaction DATE NOT NULL,
  description      TEXT NOT NULL,
  type             ENUM('depense','recette') NOT NULL,
  CONSTRAINT fk_transactions_ppe
    FOREIGN KEY (id_ppe) REFERENCES PPE(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_transactions_categorie
    FOREIGN KEY (id_categorie) REFERENCES Categories(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  -- SET NULL et non CASCADE : supprimer un projet ou une facture ne doit
  -- jamais effacer un mouvement comptable deja enregistre.
  CONSTRAINT fk_transactions_projet
    FOREIGN KEY (id_projet) REFERENCES Projets(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_transactions_facture
    FOREIGN KEY (id_facture) REFERENCES Factures(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;
 
CREATE INDEX idx_transactions_date   ON Transactions (id_ppe, date_transaction);
CREATE INDEX idx_transactions_projet ON Transactions (id_projet);
 
 
-- -----------------------------------------------------------------------------
-- Commenter : commentaires des coproprietaires sur un budget annuel.
-- Association PORTEUSE de donnees (texte + date) : elle a donc un id technique
-- et PAS de contrainte d'unicite, un utilisateur pouvant commenter plusieurs fois.
-- -----------------------------------------------------------------------------
CREATE TABLE Commenter (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_utilisateur   INT UNSIGNED NOT NULL,
  id_budget_annuel INT UNSIGNED NOT NULL,
  commentaire      TEXT NOT NULL,
  date_commentaire DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_commenter_utilisateur
    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_commenter_budget
    FOREIGN KEY (id_budget_annuel) REFERENCES Budgets_Annuels(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
 
 
-- -----------------------------------------------------------------------------
-- Votes : un vote porte sur EXACTEMENT UN objet (projet, devis ou budget).
-- Le CHECK utilise CASE WHEN et non (col IS NOT NULL) + ... : MariaDB refuse
-- la seconde forme avec l'erreur 1901.
-- Les 3 UNIQUE empechent le double vote ; MySQL et MariaDB autorisant plusieurs
-- NULL dans un index unique, ils ne se genent pas entre eux.
-- -----------------------------------------------------------------------------
CREATE TABLE Votes (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_utilisateur   INT UNSIGNED NOT NULL,
  id_projet        INT UNSIGNED NULL,
  id_devis         INT UNSIGNED NULL,
  id_budget_annuel INT UNSIGNED NULL,
  choix            ENUM('pour','contre','abstention') NOT NULL,
  date_vote        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_votes_une_cible CHECK (
      (CASE WHEN id_projet        IS NULL THEN 0 ELSE 1 END)
    + (CASE WHEN id_devis         IS NULL THEN 0 ELSE 1 END)
    + (CASE WHEN id_budget_annuel IS NULL THEN 0 ELSE 1 END) = 1
  ),
  CONSTRAINT uq_vote_projet UNIQUE (id_utilisateur, id_projet),
  CONSTRAINT uq_vote_devis  UNIQUE (id_utilisateur, id_devis),
  CONSTRAINT uq_vote_budget UNIQUE (id_utilisateur, id_budget_annuel),
  CONSTRAINT fk_votes_utilisateur
    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_votes_projet
    FOREIGN KEY (id_projet) REFERENCES Projets(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_votes_devis
    FOREIGN KEY (id_devis) REFERENCES Devis(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_votes_budget
    FOREIGN KEY (id_budget_annuel) REFERENCES Budgets_Annuels(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
 