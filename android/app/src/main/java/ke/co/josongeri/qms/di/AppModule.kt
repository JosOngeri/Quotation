package ke.co.josongeri.qms.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import ke.co.josongeri.qms.core.config.HostProvider
import ke.co.josongeri.qms.core.network.ApiClient
import ke.co.josongeri.qms.core.storage.SettingsStore
import ke.co.josongeri.qms.core.storage.TokenStore

/**
 * Singletons ([SettingsStore], [TokenStore], [HostProvider], [ApiClient]) are
 * constructed by Hilt via their @Inject constructors — this module is the
 * place for any future manual providers (e.g. a Socket.IO client).
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule
