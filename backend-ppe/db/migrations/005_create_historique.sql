-- KAN-35 : a executer UNE FOIS sur une base deja creee avant l'ajout de la
-- table Historique dans BD.sql (une base recreee depuis BD.sql l'a deja).
--   mysql PPE < db/migrations/005_create_historique.sql

CREATE TABLE IF NOT EXISTS Historique (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_ppe         INT UNSIGNED NOT NULL,
  id_utilisateur INT UNSIGNED NULL,
  type_element   ENUM('projet','depense') NOT NULL,
  id_element     INT UNSIGNED NOT NULL,
  id_projet      INT UNSIGNED NULL COMMENT 'projet concerne (le projet lui-meme ou celui de la depense)',
  action         ENUM('creation','modification','suppression') NOT NULL,
  details        TEXT NOT NULL,
  date_action    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_historique_ppe
    FOREIGN KEY (id_ppe) REFERENCES PPE(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_historique_utilisateur
    FOREIGN KEY (id_utilisateur) REFERENCES Utilisateurs(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_historique_date    ON Historique (id_ppe, date_action);
CREATE INDEX idx_historique_element ON Historique (type_element, id_element);
CREATE INDEX idx_historique_projet  ON Historique (id_projet);
