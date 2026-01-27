import '@testing-library/jest-dom'

// Mock Supabase client for tests
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    }
  }
}))

// Mock service dependencies
vi.mock('../../services/auth', () => ({
  AuthService: {
    isAuthenticated: vi.fn(() => Promise.resolve(false))
  }
}))

vi.mock('../../services/anonymous', () => ({
  AnonymousService: {
    init: vi.fn(),
    getAnonymousId: vi.fn(() => 'test-anonymous-id')
  }
}))

vi.mock('../../services/hybridDataManager', () => ({
  HybridDataManager: {
    getUserCharacters: vi.fn(() => Promise.resolve([])),
    getCharacter: vi.fn(),
    updateCharacter: vi.fn(),
    updateSingleSkillProficiency: vi.fn()
  }
}))

vi.mock('../../services/detailedCharacter', () => ({
  DetailedCharacterService: {
    updateExtraData: vi.fn(() => Promise.resolve(true))
  }
}))

vi.mock('../../services/databaseInit', () => ({
  DatabaseInitService: {
    initializeTables: vi.fn(() => Promise.resolve())
  }
}))

vi.mock('../../services/userSettings', () => ({
  UserSettingsService: {
    getLastCharacterId: vi.fn(),
    setLastCharacterId: vi.fn()
  }
}))