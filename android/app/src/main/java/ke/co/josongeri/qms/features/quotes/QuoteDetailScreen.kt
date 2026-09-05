package ke.co.josongeri.qms.features.quotes

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import ke.co.josongeri.qms.core.network.dto.QuoteItemDto
import ke.co.josongeri.qms.core.network.dto.QuoteNodeDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuoteDetailScreen(
    onBack: () -> Unit,
    viewModel: QuoteDetailViewModel = hiltViewModel(),
) {
    val ui by viewModel.ui.collectAsStateWithLifecycle()
    val quote = ui.detail?.quote
    val revision = ui.detail?.revision
    val currency = revision?.currency ?: quote?.currency

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(quote?.quoteNumber ?: "Quote") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when {
                ui.loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                ui.error != null -> Text(
                    ui.error.orEmpty(),
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.align(Alignment.Center),
                )
                ui.detail?.roots.isNullOrEmpty() -> Text(
                    "No revision tree available",
                    modifier = Modifier.align(Alignment.Center),
                )
                else -> {
                    val roots = ui.detail!!.roots.sortedBy { it.ordinal ?: 0 }
                    LazyColumn(
                        Modifier.fillMaxSize().padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        items(roots.size) { index ->
                            NodeView(
                                node = roots[index],
                                depth = 0,
                                currency = currency,
                                expanded = ui.expandedNodes,
                                onToggle = viewModel::toggleNode,
                            )
                        }
                        item {
                            Spacer(Modifier.height(16.dp))
                            val totals = ui.detail!!.totals
                            TotalsCard(
                                subtotal = totals?.subtotalAmountMinor,
                                tax = totals?.taxAmountMinor,
                                total = totals?.totalAmountMinor,
                                currency = currency,
                                version = revision?.version,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NodeView(
    node: QuoteNodeDto,
    depth: Int,
    currency: String?,
    expanded: Set<String>,
    onToggle: (String) -> Unit,
) {
    val isExpanded = expanded.contains(node.id)
    Column(Modifier.padding(start = (depth * 16).dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { onToggle(node.id) }
                .padding(vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                contentDescription = null,
                modifier = Modifier.size(20.dp),
            )
            Spacer(Modifier.width(4.dp))
            Text(
                node.title ?: node.nodeType ?: "Section",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.weight(1f),
            )
            node.subtotalMinor?.let {
                Text(formatMoney(it, currency), style = MaterialTheme.typography.bodySmall)
            }
        }
        if (!node.description.isNullOrBlank() && isExpanded) {
            Text(
                node.description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 24.dp, bottom = 4.dp),
            )
        }
        if (isExpanded) {
            node.items.sortedBy { it.id }.forEach { item ->
                ItemRow(item, currency)
            }
            node.children.sortedBy { it.ordinal ?: 0 }.forEach { child ->
                NodeView(child, depth + 1, currency, expanded, onToggle)
            }
        }
    }
}

@Composable
private fun ItemRow(item: QuoteItemDto, currency: String?) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 24.dp, top = 2.dp, bottom = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Column(Modifier.weight(1f)) {
            Text(item.name ?: item.description ?: "Item", style = MaterialTheme.typography.bodyMedium)
            Text(
                "${item.quantity ?: 0} ${item.unit.orEmpty()} × " +
                    formatMoney(item.sellPriceMinor ?: item.unitCostMinor ?: 0, currency),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(
            formatMoney(item.lineTotalMinor ?: 0, currency),
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}

@Composable
private fun TotalsCard(
    subtotal: Long?,
    tax: Long?,
    total: Long?,
    currency: String?,
    version: Int?,
) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            version?.let {
                Text("Revision v$it", style = MaterialTheme.typography.labelSmall)
                Spacer(Modifier.height(8.dp))
            }
            TotalLine("Subtotal", subtotal, currency)
            TotalLine("Tax", tax, currency)
            HorizontalDivider(Modifier.padding(vertical = 8.dp))
            TotalLine("Total", total, currency, bold = true)
        }
    }
}

@Composable
private fun TotalLine(label: String, value: Long?, currency: String?, bold: Boolean = false) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(
            label,
            style = if (bold) MaterialTheme.typography.titleMedium
            else MaterialTheme.typography.bodyMedium,
        )
        Text(
            value?.let { formatMoney(it, currency) } ?: "—",
            style = if (bold) MaterialTheme.typography.titleMedium
            else MaterialTheme.typography.bodyMedium,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal,
        )
    }
}
