CREATE TABLE IF NOT EXISTS azlottery_payment_providers (
  code VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  name VARCHAR(100) NOT NULL,
  receiver_phone VARCHAR(32) NOT NULL,
  receiver_name VARCHAR(128) NOT NULL,
  status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
  updated_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (code),
  KEY ix_azlottery_payment_providers_status (status),
  CONSTRAINT fk_azlottery_payment_providers_updated_by FOREIGN KEY (updated_by_user_id)
    REFERENCES azlottery_users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS azlottery_payment_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  kind ENUM('deposit', 'withdrawal') NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  phone VARCHAR(32) NOT NULL,
  transfer_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  amount_mmk BIGINT UNSIGNED NULL,
  provider_code VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL,
  payout_reference VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NULL,
  admin_note VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME NULL,
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_azlottery_payment_request_transfer_id (transfer_id),
  UNIQUE KEY uq_azlottery_payment_request_payout (provider_code, payout_reference),
  KEY ix_azlottery_payment_request_user_time (user_id, created_at),
  KEY ix_azlottery_payment_request_review_queue (status, kind, created_at),
  CONSTRAINT fk_azlottery_payment_request_user FOREIGN KEY (user_id)
    REFERENCES azlottery_users (id),
  CONSTRAINT fk_azlottery_payment_request_provider FOREIGN KEY (provider_code)
    REFERENCES azlottery_payment_providers (code),
  CONSTRAINT fk_azlottery_payment_request_reviewer FOREIGN KEY (reviewed_by_user_id)
    REFERENCES azlottery_users (id),
  CONSTRAINT chk_azlottery_payment_request_shape CHECK (
    (kind = 'deposit' AND transfer_id IS NOT NULL AND (amount_mmk IS NULL OR amount_mmk > 0)) OR
    (kind = 'withdrawal' AND transfer_id IS NULL AND amount_mmk IS NOT NULL AND amount_mmk > 0)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
