package ke.co.josongeri.qms

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import dagger.hilt.android.AndroidEntryPoint
import ke.co.josongeri.qms.core.storage.TokenStore
import ke.co.josongeri.qms.navigation.AppNavHost
import ke.co.josongeri.qms.navigation.Routes
import ke.co.josongeri.qms.ui.theme.QmsTheme
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var tokenStore: TokenStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val startDestination =
            if (tokenStore.getToken() != null) Routes.DASHBOARD else Routes.LOGIN
        setContent {
            QmsTheme {
                AppNavHost(startDestination = startDestination)
            }
        }
    }
}
