use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, near_bindgen, AccountId, PanicOnDefault};
use std::collections::HashSet;

#[derive(Serialize, Deserialize, BorshDeserialize, BorshSerialize, Clone)]
#[serde(crate = "near_sdk::serde")]
pub struct SessionRecord {
    pub cid: String,
    pub lit_hash: String,
    pub label: String,
    pub timestamp: u64,
    pub cognitive_state: String,
}

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize, PanicOnDefault)]
pub struct NeuralVault {
    // Map from AccountId to list of their sessions
    sessions: near_sdk::store::LookupMap<AccountId, Vec<SessionRecord>>,
    access_grants: near_sdk::store::LookupMap<AccountId, Vec<AccountId>>,
    // Map from voiceprint_hash -> CID of encrypted profile
    identities: near_sdk::store::LookupMap<String, String>,
    // Map from voiceprint_hash -> Owner AccountId
    identity_owners: near_sdk::store::LookupMap<String, AccountId>,
}

#[near_bindgen]
impl NeuralVault {
    #[init]
    pub fn new() -> Self {
        Self {
            sessions: near_sdk::store::LookupMap::new(b"s".to_vec()),
            access_grants: near_sdk::store::LookupMap::new(b"a".to_vec()),
            identities: near_sdk::store::LookupMap::new(b"i".to_vec()),
            identity_owners: near_sdk::store::LookupMap::new(b"o".to_vec()),
        }
    }

    pub fn store_session(&mut self, cid: String, lit_hash: String, label: String, cognitive_state: String) {
        let owner = env::predecessor_account_id();
        let record = SessionRecord {
            cid,
            lit_hash,
            label,
            timestamp: env::block_timestamp(),
            cognitive_state,
        };

        if let Some(mut user_sessions) = self.sessions.get_mut(&owner) {
            user_sessions.push(record);
        } else {
            self.sessions.insert(owner.clone(), vec![record]);
        }

        env::log_str(&format!("Session stored for {}", owner));
    }

    pub fn grant_access(&mut self, researcher: AccountId) {
        let owner = env::predecessor_account_id();
        
        if let Some(mut grants) = self.access_grants.get_mut(&owner) {
            if !grants.contains(&researcher) {
                grants.push(researcher.clone());
            }
        } else {
            self.access_grants.insert(owner.clone(), vec![researcher.clone()]);
        }

        env::log_str(&format!("Access granted to {} by {}", researcher, owner));
    }

    pub fn revoke_access(&mut self, researcher: AccountId) {
        let owner = env::predecessor_account_id();
        
        if let Some(mut grants) = self.access_grants.get_mut(&owner) {
            grants.retain(|x| x != &researcher);
        }

        env::log_str(&format!("Access revoked for {} by {}", researcher, owner));
    }

    pub fn has_access(&self, owner: AccountId, researcher: AccountId) -> bool {
        if owner == researcher {
            return true;
        }
        if let Some(grants) = self.access_grants.get(&owner) {
            grants.contains(&researcher)
        } else {
            false
        }
    }

    pub fn get_sessions(&self, owner: AccountId) -> Vec<SessionRecord> {
        self.sessions.get(&owner).cloned().unwrap_or_default()
    }

    pub fn get_my_grants(&self) -> Vec<AccountId> {
        let owner = env::predecessor_account_id();
        self.access_grants.get(&owner).cloned().unwrap_or_default()
    }

    // Identity Management
    pub fn store_identity(&mut self, voiceprint_hash: String, cid: String) {
        let owner = env::predecessor_account_id();
        assert!(!self.identities.contains_key(&voiceprint_hash), "Identity already exists for this voiceprint");
        
        self.identities.insert(voiceprint_hash.clone(), cid);
        self.identity_owners.insert(voiceprint_hash.clone(), owner.clone());
        
        env::log_str(&format!("Identity stored for hash: {}", voiceprint_hash));
    }

    pub fn get_identity_cid(&self, voiceprint_hash: String) -> Option<String> {
        self.identities.get(&voiceprint_hash).cloned()
    }

    pub fn update_identity_cid(&mut self, voiceprint_hash: String, new_cid: String) {
        let owner = env::predecessor_account_id();
        let actual_owner = self.identity_owners.get(&voiceprint_hash).expect("Identity not found");
        
        assert_eq!(owner, *actual_owner, "Only the original registrant can update this identity");
        self.identities.insert(voiceprint_hash.clone(), new_cid);
        
        env::log_str(&format!("Identity updated for hash: {}", voiceprint_hash));
    }
}
